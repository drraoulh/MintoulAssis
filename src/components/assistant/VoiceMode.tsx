'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic, Volume2, X } from 'lucide-react';

import { friendlyError, sendChatMessage, synthesizeSpeech, transcribeAudio } from '@/lib/api/client';
import {
  browserSttAvailable,
  startBrowserStt,
  type BrowserSttSession,
} from '@/lib/audio/browserStt';
import { audioPlayback } from '@/lib/audio/playback';
import { blobToWavBlob } from '@/lib/audio/toWav';
import { cleanForSpeech, speakOnDevice, stopDeviceSpeech } from '@/lib/audio/tts';
import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { useLocale } from '@/lib/i18n';
import { structuredFromChatResponse } from '@/lib/utils/response';
import type { StructuredChatUI } from '@/lib/types';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export type VoiceExchange = {
  userText?: string;
  assistantText?: string;
  ui?: StructuredChatUI | null;
  conversationId?: string;
  tip?: string;
  error?: string;
};

const MAX_RECORD_MS = 25_000;
const MIN_RECORD_MS = 1_200;
const MIN_BLOB_BYTES = 8_000;

function phaseCopy(phase: VoicePhase): {
  title: string;
  subtitle: string;
  action: string;
} {
  switch (phase) {
    case 'listening':
      return {
        title: 'Je vous écoute',
        subtitle: 'Parlez clairement, puis appuyez pour envoyer.',
        action: 'Appuyer pour envoyer',
      };
    case 'thinking':
      return {
        title: 'Je comprends…',
        subtitle: 'Transcription puis réponse du guide.',
        action: 'Patientez',
      };
    case 'speaking':
      return {
        title: 'Réponse en cours',
        subtitle: 'Écoutez le guide, ou appuyez pour interrompre.',
        action: 'Appuyer pour interrompre',
      };
    default:
      return {
        title: 'Prêt à vous écouter',
        subtitle: 'Appuyez sur le micro, parlez, puis renvoyez.',
        action: 'Appuyer pour parler',
      };
  }
}

function VoiceWave({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-[var(--gold)] transition-all ${
            active ? 'animate-pulse' : 'opacity-40'
          }`}
          style={{
            height: active ? `${14 + ((i * 7) % 18)}px` : '8px',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
    return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return undefined;
}

/**
 * Voice mode:
 * - Chrome/Edge: browser SpeechRecognition (free, reliable)
 * - Else: MediaRecorder → WAV → HF Whisper / OpenRouter → chat → TTS
 */
export function VoiceMode({
  open,
  onClose,
  conversationId,
  onExchange,
}: {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  onExchange: (exchange: VoiceExchange) => void;
}) {
  const { locale } = useLocale();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [userText, setUserText] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useBrowserStt, setUseBrowserStt] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartedAtRef = useRef(0);
  const maxTimerRef = useRef<number | undefined>(undefined);
  const sendingRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const conversationIdRef = useRef(conversationId);
  const finishRef = useRef<() => Promise<void>>(async () => undefined);
  const shutdownRef = useRef<() => void>(() => undefined);
  const onExchangeRef = useRef(onExchange);
  const localeRef = useRef(locale);
  const browserSessionRef = useRef<BrowserSttSession | null>(null);
  const sttModeRef = useRef<'browser' | 'server'>('server');

  useEffect(() => {
    setMounted(true);
    // Prefer server Whisper when SPEECH_PROVIDER=huggingface; else browser STT
    const preferServer =
      (process.env.NEXT_PUBLIC_SPEECH_PROVIDER || '').toLowerCase() ===
      'huggingface';
    setUseBrowserStt(!preferServer && browserSttAvailable());
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    onExchangeRef.current = onExchange;
  }, [onExchange]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current !== undefined) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = undefined;
    }
  }, []);

  const stopRecorderOnly = useCallback(() => {
    clearMaxTimer();
    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [clearMaxTimer]);

  const abortBrowserSession = useCallback(() => {
    try {
      browserSessionRef.current?.abort();
    } catch {
      /* ignore */
    }
    browserSessionRef.current = null;
  }, []);

  const releaseMic = useCallback(() => {
    abortBrowserSession();
    stopRecorderOnly();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setMicReady(false);
  }, [abortBrowserSession, stopRecorderOnly]);

  const shutdown = useCallback(() => {
    sendingRef.current = false;
    clearMaxTimer();
    audioPlayback.stop();
    stopDeviceSpeech();
    releaseMic();
    setPhase('idle');
  }, [clearMaxTimer, releaseMic]);

  const armMic = useCallback(async (): Promise<MediaStream> => {
    if (mediaStreamRef.current) {
      const live = mediaStreamRef.current
        .getAudioTracks()
        .some((t) => t.readyState === 'live');
      if (live) {
        setMicReady(true);
        return mediaStreamRef.current;
      }
      releaseMic();
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    mediaStreamRef.current = stream;
    setMicReady(true);
    return stream;
  }, [releaseMic]);

  const runChatFromText = useCallback(async (text: string) => {
    setUserText(text);
    onExchangeRef.current({ userText: text });
    setAssistantText('');

    const res = await sendChatMessage({
      message: text,
      conversation_id: conversationIdRef.current,
      locale: localeRef.current,
    });

    if (res.conversation_id) conversationIdRef.current = res.conversation_id;
    const answer = (res.message || res.text || '').trim();
    setAssistantText(answer);
    onExchangeRef.current({
      assistantText: answer || undefined,
      ui: structuredFromChatResponse(res),
      conversationId: res.conversation_id,
    });

    if (answer) {
      setPhase('speaking');
      const spoken = cleanForSpeech(answer);
      try {
        const blob = await synthesizeSpeech(spoken || answer, {
          locale: localeRef.current,
        });
        await audioPlayback.playExclusive(blob);
      } catch {
        await speakOnDevice(spoken || answer, localeRef.current);
      }
    }

    sendingRef.current = false;
    setPhase('idle');
    setHint(null);
    void armMic().catch(() => setMicReady(false));
  }, [armMic]);

  const startListening = useCallback(async () => {
    if (sendingRef.current || phaseRef.current === 'listening') return;
    setHint(null);
    audioPlayback.stop();
    stopDeviceSpeech();
    setPhase('listening');
    setAssistantText('');

    // Prefer server Whisper when configured; browser STT as fallback only
    const preferServer =
      (process.env.NEXT_PUBLIC_SPEECH_PROVIDER || '').toLowerCase() ===
        'huggingface' ||
      !browserSttAvailable();

    if (!preferServer && browserSttAvailable()) {
      sttModeRef.current = 'browser';
      setUseBrowserStt(true);
      setMicReady(true);
      const lang = localeRef.current === 'en' ? 'en-US' : 'fr-FR';
      const session = startBrowserStt({ lang, timeoutMs: MAX_RECORD_MS });
      browserSessionRef.current = session;
      recordStartedAtRef.current = Date.now();
      return;
    }

    sttModeRef.current = 'server';
    setUseBrowserStt(false);
    try {
      const stream = await armMic();
      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordStartedAtRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.start(250);

      clearMaxTimer();
      maxTimerRef.current = window.setTimeout(() => {
        void finishRef.current();
      }, MAX_RECORD_MS);
    } catch (err) {
      const msg =
        err instanceof Error && /Permission|NotAllowed|NotFound/i.test(err.message)
          ? 'Micro non autorisé. Autorisez l’accès au micro dans le navigateur.'
          : 'Impossible d’accéder au micro.';
      setHint(msg);
      onExchangeRef.current({ error: msg });
      setPhase('idle');
      stopRecorderOnly();
    }
  }, [armMic, clearMaxTimer, stopRecorderOnly]);

  const finishListeningAndSend = useCallback(async () => {
    if (sendingRef.current) return;

    // --- Browser STT path ---
    if (sttModeRef.current === 'browser' && browserSessionRef.current) {
      const elapsed = Date.now() - recordStartedAtRef.current;
      if (elapsed < MIN_RECORD_MS) {
        setHint(
          'Enregistrement trop court. Parlez au moins une à deux secondes, puis renvoyez.',
        );
        abortBrowserSession();
        setPhase('idle');
        return;
      }

      sendingRef.current = true;
      setPhase('thinking');
      const session = browserSessionRef.current;
      browserSessionRef.current = null;
      session.stop();

      try {
        const text = (await session.done).trim();
        if (!text) {
          const tip =
            'Je n’ai pas compris. Parlez plus distinctement près du micro, puis réessayez.';
          setHint(tip);
          onExchangeRef.current({ tip });
          sendingRef.current = false;
          setPhase('idle');
          return;
        }
        await runChatFromText(text);
      } catch (err) {
        const tip = friendlyError(err);
        setHint(tip);
        onExchangeRef.current({ error: tip });
        sendingRef.current = false;
        setPhase('idle');
      }
      return;
    }

    // --- Server STT path (HF Whisper / OpenRouter) ---
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const elapsed = Date.now() - recordStartedAtRef.current;
    if (elapsed < MIN_RECORD_MS) {
      setHint(
        'Enregistrement trop court. Parlez au moins une à deux secondes, puis renvoyez.',
      );
      stopRecorderOnly();
      setPhase('idle');
      return;
    }

    sendingRef.current = true;
    setPhase('thinking');
    clearMaxTimer();

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      recorder.onstop = done;
      try {
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch {
            /* ignore */
          }
          recorder.stop();
        } else done();
      } catch {
        done();
      }
    });

    mediaRecorderRef.current = null;

    const mimeFull = recorder.mimeType || 'audio/webm';
    const rawBlob = new Blob(chunksRef.current, { type: mimeFull });
    chunksRef.current = [];

    if (rawBlob.size < MIN_BLOB_BYTES) {
      const tip =
        'Je n’ai presque rien capté. Rapprochez-vous du micro et reparlez un peu plus longtemps.';
      setHint(tip);
      onExchangeRef.current({ tip });
      sendingRef.current = false;
      setPhase('idle');
      return;
    }

    try {
      let uploadBlob: Blob;
      try {
        uploadBlob = await blobToWavBlob(rawBlob);
      } catch {
        const tip =
          'Impossible de préparer l’audio. Réessayez, ou utilisez Chrome / Edge.';
        setHint(tip);
        onExchangeRef.current({ tip });
        sendingRef.current = false;
        setPhase('idle');
        return;
      }

      const { text } = await transcribeAudio(uploadBlob, {
        mimeType: 'audio/wav',
        filename: 'recording.wav',
      });

      if (!text) {
        const tip =
          'Je n’ai pas compris. Parlez plus distinctement près du micro, puis réessayez.';
        setHint(tip);
        onExchangeRef.current({ tip });
        sendingRef.current = false;
        setPhase('idle');
        return;
      }

      await runChatFromText(text);
    } catch (err) {
      // Server STT failed → one-shot browser recognition if available
      if (browserSttAvailable()) {
        try {
          setHint('Je bascule sur la reconnaissance du navigateur…');
          const lang = localeRef.current === 'en' ? 'en-US' : 'fr-FR';
          const session = startBrowserStt({ lang, timeoutMs: 12_000 });
          browserSessionRef.current = session;
          setPhase('listening');
          sendingRef.current = false;
          sttModeRef.current = 'browser';
          setUseBrowserStt(true);
          return;
        } catch {
          /* fall through */
        }
      }
      const tip = friendlyError(err);
      setHint(tip);
      onExchangeRef.current({ error: tip });
      sendingRef.current = false;
      setPhase('idle');
    }
  }, [abortBrowserSession, clearMaxTimer, runChatFromText, stopRecorderOnly]);

  useEffect(() => {
    finishRef.current = finishListeningAndSend;
  }, [finishListeningAndSend]);

  useEffect(() => {
    shutdownRef.current = shutdown;
  }, [shutdown]);

  const onOrbPress = useCallback(() => {
    if (phase === 'thinking') return;
    if (phase === 'idle') {
      void startListening();
      return;
    }
    if (phase === 'listening') {
      void finishListeningAndSend();
      return;
    }
    if (phase === 'speaking') {
      audioPlayback.stop();
      stopDeviceSpeech();
      sendingRef.current = false;
      setPhase('idle');
      setHint(null);
      void startListening();
    }
  }, [finishListeningAndSend, phase, startListening]);

  useEffect(() => {
    if (!open) {
      shutdownRef.current();
      setUserText('');
      setAssistantText('');
      setHint(null);
      setMicReady(false);
      return;
    }
    setPhase('idle');
    setHint(null);
    void armMic().catch(() => {
      setMicReady(false);
      setHint('Autorisez le micro pour parler au guide.');
    });
    return () => {
      shutdownRef.current();
    };
  }, [open, armMic]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        shutdownRef.current();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const copy = phaseCopy(phase);
  const live = phase === 'listening' || phase === 'speaking';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--green-deep)] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Mode vocal SmartMboa"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(214,168,79,0.35), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(26,122,86,0.5), transparent)',
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]">
            SmartMboa
          </p>
          <h2 className="font-display text-xl font-bold md:text-2xl">Mode vocal</h2>
          <p className="mt-0.5 text-xs text-white/55">
            {useBrowserStt
              ? 'Micro navigateur → guide → lecture'
              : 'Micro → Whisper → guide → lecture'}
            {micReady ? ' · micro prêt' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            shutdown();
            onClose();
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20"
          aria-label="Fermer le mode vocal"
        >
          <X className="h-4 w-4" aria-hidden />
          Fermer
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 md:px-8">
        <div className="w-full max-w-lg space-y-3 text-center">
          <p className="font-display text-2xl font-semibold md:text-3xl" aria-live="polite">
            {copy.title}
          </p>
          <p className="text-sm text-white/75 md:text-base">{copy.subtitle}</p>
          <VoiceWave active={live} />
        </div>

        <div className="flex flex-col items-center gap-5 py-6">
          <button
            type="button"
            onClick={onOrbPress}
            disabled={phase === 'thinking'}
            aria-label={copy.action}
            className={`relative flex h-36 w-36 items-center justify-center rounded-full shadow-[0_0_0_12px_rgba(214,168,79,0.15)] transition select-none disabled:cursor-wait disabled:opacity-70 md:h-44 md:w-44 ${
              phase === 'listening'
                ? 'bg-[var(--danger)] shadow-[0_0_0_16px_rgba(180,35,24,0.25)]'
                : phase === 'speaking'
                  ? 'bg-[var(--gold)] text-[var(--green-deep)]'
                  : 'bg-white text-[var(--green-deep)]'
            }`}
          >
            {phase === 'listening' ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--danger)] opacity-30" />
            ) : null}
            {phase === 'thinking' ? (
              <Loader2 className="relative h-12 w-12 animate-spin" aria-hidden />
            ) : phase === 'speaking' ? (
              <Volume2 className="relative h-12 w-12" aria-hidden />
            ) : (
              <Mic className="relative h-12 w-12" aria-hidden />
            )}
          </button>
          <p className="text-sm font-semibold text-[var(--gold-soft)]">{copy.action}</p>
        </div>

        <div className="w-full max-w-lg space-y-3">
          {hint ? (
            <p
              className="rounded-2xl bg-white/10 px-4 py-3 text-center text-sm text-[var(--gold-soft)]"
              role="status"
            >
              {hint}
            </p>
          ) : null}
          {(userText || assistantText) && (
            <div className="max-h-52 space-y-3 overflow-y-auto rounded-2xl bg-black/20 p-4 text-left text-sm backdrop-blur">
              {userText ? (
                <p>
                  <span className="font-semibold text-[var(--gold-soft)]">Vous · </span>
                  {userText}
                </p>
              ) : null}
              {assistantText ? (
                <div>
                  <p className="mb-2 font-semibold text-[var(--gold-soft)]">SmartMboa</p>
                  <MarkdownContent
                    content={assistantText}
                    variant="onDark"
                    className="text-sm"
                  />
                </div>
              ) : null}
            </div>
          )}
          <p className="text-center text-xs leading-relaxed text-white/50">
            Les échanges apparaissent aussi dans le chat. Utilisez « Lire » / « Stop »
            sur les réponses texte si besoin.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
