'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Compass,
  Hotel,
  Landmark,
  MapPin,
  Mic,
  SendHorizontal,
  Square,
  Trees,
  Utensils,
  Volume2,
} from 'lucide-react';

import { ResponseRenderer } from '@/components/assistant/ResponseRenderer';
import { VisionCameraSheet } from '@/components/assistant/VisionCameraSheet';
import { AssistantMark } from '@/components/brand/AssistantMark';
import {
  VoiceMode,
  type VoiceExchange,
} from '@/components/assistant/VoiceMode';
import { Button, ErrorState, Input, ThinkingDots } from '@/components/ui';
import {
  friendlyError,
  runVisionGuide,
  sendChatMessage,
  synthesizeSpeech,
} from '@/lib/api/client';
import { audioPlayback } from '@/lib/audio/playback';
import { speakOnDevice, splitForSpeech, stopDeviceSpeech } from '@/lib/audio/tts';
import { useLocale } from '@/lib/i18n';
import { structuredFromChatResponse } from '@/lib/utils/response';
import type { StructuredChatUI, VisionGuideResponse } from '@/lib/types';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  ui?: StructuredChatUI | null;
  isError?: boolean;
  isTip?: boolean;
  streaming?: boolean;
}

const SUGGESTIONS = [
  { icon: MapPin, labelKey: 'assistant.sug.nearby', qKey: 'assistant.sug.nearbyQ' },
  { icon: Compass, labelKey: 'assistant.sug.plan', qKey: 'assistant.sug.planQ' },
  { icon: Landmark, labelKey: 'assistant.sug.culture', qKey: 'assistant.sug.cultureQ' },
  { icon: Trees, labelKey: 'assistant.sug.nature', qKey: 'assistant.sug.natureQ' },
  { icon: Utensils, labelKey: 'assistant.sug.food', qKey: 'assistant.sug.foodQ' },
  { icon: Hotel, labelKey: 'assistant.sug.hotel', qKey: 'assistant.sug.hotelQ' },
] as const;

export function AssistantChat({
  initialQuestion,
  autoVoice,
  autoVision,
}: {
  initialQuestion?: string;
  autoVoice?: boolean;
  autoVision?: boolean;
}) {
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [visionPhase, setVisionPhase] = useState<string | null>(null);
  const [awaitingVisionNote, setAwaitingVisionNote] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const pendingVisionFileRef = useRef<File | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const streamAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    return audioPlayback.subscribe(setAudioPlaying);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, visionPhase]);

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current = [];
    };
  }, []);

  const stopAllAudio = useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    stopDeviceSpeech();
    audioPlayback.stop();
    setSpeakingMsgId(null);
  }, []);

  function visionUiFromGuide(res: VisionGuideResponse): StructuredChatUI {
    const ui_sources = (res.sources ?? [])
      .filter((s) => s.url && /^https?:\/\//i.test(s.url))
      .map((s) => ({
        title: s.title || s.url,
        url: s.url,
        type: 'WEB' as const,
      }));
    return {
      response_type: 'VISION',
      vision: {
        description: res.analysis?.short_description || res.description || null,
        matched_place_id: null,
        confidence: res.confidence,
      },
      ui_sources,
    };
  }

  async function analyzeVision(file: File, userNote?: string | null) {
    if (sending || voiceOpen) return;
    stopAllAudio();
    setSending(true);
    setVisionPhase(
      userNote?.trim()
        ? 'Recherche & rédaction du guide…'
        : 'Analyse de la photo avec Vision…',
    );

    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.push(preview);

    if (!userNote?.trim()) {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-vu`,
          role: 'user',
          content: 'Photo à identifier',
          imageUrl: preview,
        },
      ]);
    }

    try {
      const res = await runVisionGuide(file, {
        locale,
        userNote: userNote?.trim() || null,
      });

      if (res.status === 'needs_clarification') {
        pendingVisionFileRef.current = file;
        setAwaitingVisionNote(true);
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now()}-vc`,
            role: 'assistant',
            content:
              res.clarifying_question ||
              (locale === 'en'
                ? 'I need a bit more detail about this photo (city or region). Reply with a short note.'
                : 'J’ai besoin d’une précision sur cette photo (ville ou région). Répondez par un court message.'),
            ui: {
              response_type: 'CLARIFICATION',
              vision: {
                description: res.analysis?.short_description || res.description,
                confidence: res.confidence,
              },
            },
          },
        ]);
        return;
      }

      pendingVisionFileRef.current = null;
      setAwaitingVisionNote(false);
      const message =
        res.message?.trim() ||
        res.description ||
        (locale === 'en'
          ? 'I could not analyze this photo.'
          : 'Je n’ai pas pu analyser cette photo.');

      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-va`,
          role: 'assistant',
          content: message,
          ui: visionUiFromGuide(res),
        },
      ]);
    } catch (error) {
      pendingVisionFileRef.current = null;
      setAwaitingVisionNote(false);
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-ve`,
          role: 'assistant',
          content: friendlyError(error),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
      setVisionPhase(null);
    }
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || voiceOpen) return;

    // If Vision asked for clarification, continue the photo pipeline with the note.
    if (pendingVisionFileRef.current) {
      const file = pendingVisionFileRef.current;
      setMessages((m) => [
        ...m,
        { id: `${Date.now()}-u`, role: 'user', content: trimmed },
      ]);
      setInput('');
      await analyzeVision(file, trimmed);
      return;
    }

    stopAllAudio();
    setSending(true);
    setMessages((m) => [
      ...m,
      { id: `${Date.now()}-u`, role: 'user', content: trimmed },
    ]);
    setInput('');
    try {
      const res = await sendChatMessage({
        message: trimmed,
        conversation_id: conversationId,
        locale,
      });
      setConversationId(res.conversation_id);
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: res.message || res.text || '',
          ui: structuredFromChatResponse(res),
        },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          content: friendlyError(error),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    if (autoVoice) {
      started.current = true;
      setVoiceOpen(true);
      return;
    }
    if (autoVision) {
      started.current = true;
      const id = window.setTimeout(() => setCameraOpen(true), 120);
      return () => window.clearTimeout(id);
    }
    if (initialQuestion) {
      started.current = true;
      void ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, autoVoice, autoVision]);

  const handleVoiceExchange = useCallback((ex: VoiceExchange) => {
    if (ex.conversationId) setConversationId(ex.conversationId);

    if (ex.userText) {
      setMessages((m) => [
        ...m,
        { id: `${Date.now()}-vu`, role: 'user', content: ex.userText! },
      ]);
    }

    if (ex.assistantText || ex.ui) {
      setMessages((m) => {
        const sid = streamAssistantIdRef.current;
        if (sid) {
          streamAssistantIdRef.current = null;
          return m.map((msg) =>
            msg.id === sid
              ? {
                  ...msg,
                  content: ex.assistantText || msg.content,
                  ui: ex.ui ?? msg.ui,
                  streaming: false,
                }
              : msg,
          );
        }
        return [
          ...m,
          {
            id: `${Date.now()}-va`,
            role: 'assistant',
            content: ex.assistantText || '',
            ui: ex.ui ?? undefined,
          },
        ];
      });
    }

    if (ex.tip) {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-tip`,
          role: 'assistant',
          content: ex.tip!,
          isTip: true,
        },
      ]);
    }

    if (ex.error) {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-ve`,
          role: 'assistant',
          content: ex.error!,
          isError: true,
        },
      ]);
    }
  }, []);

  async function speakMessage(msg: Msg) {
    const text = msg.content?.trim();
    if (!text || msg.isError || msg.isTip) return;

    if (speakingMsgId === msg.id) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    setSpeakingMsgId(msg.id);
    const abort = new AbortController();
    ttsAbortRef.current = abort;

    try {
      const segments = splitForSpeech(text);
      let usedServer = false;
      for (const segment of segments) {
        if (abort.signal.aborted) return;
        try {
          const blob = await synthesizeSpeech(segment, { signal: abort.signal });
          if (abort.signal.aborted) return;
          if (!usedServer) {
            audioPlayback.stop();
            usedServer = true;
          }
          audioPlayback.enqueueBlob(blob);
        } catch (error) {
          if (abort.signal.aborted) return;
          if (usedServer) throw error;
          await speakOnDevice(text, locale);
          return;
        }
      }
      if (usedServer) await audioPlayback.waitUntilIdle();
    } catch (error) {
      if (abort.signal.aborted) return;
      try {
        await speakOnDevice(text, locale);
        return;
      } catch {
        /* fall through */
      }
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-tts`,
          role: 'assistant',
          content: friendlyError(error),
          isError: true,
        },
      ]);
    } finally {
      if (ttsAbortRef.current === abort) ttsAbortRef.current = null;
      setSpeakingMsgId((id) => (id === msg.id ? null : id));
    }
  }

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  function openVoice() {
    stopAllAudio();
    setVoiceOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-[#007A5E] md:text-xl">
              {t('assistant.title')}
            </h1>
            <p className="truncate text-xs text-[#535557] md:text-sm">
              Votre guide intelligent pour découvrir le Cameroun.
            </p>
          </div>
          {(audioPlaying || speakingMsgId) && (
            <button
              type="button"
              onClick={stopAllAudio}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#CE1126] px-4 py-2 text-xs font-semibold text-white"
              aria-label="Arrêter la lecture"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={openVoice}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#007A5E] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#00614b]"
            aria-label="Ouvrir le mode vocal"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Vocal
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-6 md:px-6">
        {messages.length === 0 && !sending ? (
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <AssistantMark size="lg" className="mx-auto" />
              <p className="mt-5 text-3xl font-bold tracking-tight text-black md:text-4xl">
                Posez votre question sur le{' '}
                <span className="text-[#CE1126]">Cameroun</span>
              </p>
              <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-[#007A5E]">
                Je suis SmartMboa. Sites, culture, nature et itinéraires.
              </p>
              <button
                type="button"
                onClick={openVoice}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#007A5E] px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-[#00614b]"
              >
                <Mic className="h-4 w-4" aria-hidden />
                {t('home.ctaGuide')}
              </button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.labelKey}
                  type="button"
                  onClick={() => void ask(t(s.qKey))}
                  className="rounded-lg bg-white p-5 text-left shadow-lg transition duration-300 hover:scale-[1.02]"
                >
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCD116]/50">
                    <s.icon className="h-6 w-6 text-[#007A5E]" aria-hidden />
                  </span>
                  <span className="block text-base font-bold text-[#007A5E]">{t(s.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'ml-auto max-w-[90%] md:max-w-[75%]'
                : 'mr-auto w-full max-w-[98%] md:max-w-[92%]'
            }
          >
            <div className="mb-1 flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {msg.role === 'user' ? t('assistant.you') : t('assistant.bot')}
                {msg.streaming ? ' · …' : ''}
              </p>
              {msg.role === 'assistant' &&
              !msg.isError &&
              !msg.isTip &&
              msg.content.trim() ? (
                <button
                  type="button"
                  onClick={() => void speakMessage(msg)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                    speakingMsgId === msg.id
                      ? 'bg-[var(--danger)] text-white'
                      : 'bg-[var(--mint-soft)] text-[var(--green-deep)] hover:bg-[var(--line)]'
                  }`}
                  aria-label={
                    speakingMsgId === msg.id
                      ? 'Arrêter la lecture'
                      : 'Lire la réponse'
                  }
                >
                  {speakingMsgId === msg.id ? (
                    <>
                      <Square className="h-3 w-3 fill-current" aria-hidden />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" aria-hidden />
                      Lire
                    </>
                  )}
                </button>
              ) : null}
            </div>
            {msg.isTip ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint-soft)]/60 px-4 py-3 text-sm text-[var(--green-deep)]">
                {msg.content}
              </div>
            ) : msg.role === 'assistant' && !msg.isError ? (
              <div className="rounded-xl bg-white px-4 py-4 shadow-lg">
                <ResponseRenderer text={msg.content} ui={msg.ui} />
              </div>
            ) : msg.isError ? (
              <ErrorState message={msg.content} />
            ) : (
              <div className="rounded-2xl bg-[#007A5E] px-4 py-3 text-white shadow-md">
                {msg.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt={msg.content || 'Photo Vision'}
                    className="mb-2 max-h-56 w-full rounded-xl object-cover"
                  />
                ) : null}
                {msg.content && !msg.imageUrl ? msg.content : null}
                {msg.content && msg.imageUrl ? (
                  <p className="text-xs text-white/85">{msg.content}</p>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {sending ? (
          <ThinkingDots label={visionPhase || 'SmartMboa réfléchit…'} />
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.04)] md:p-4"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-gray-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCD116]/50 text-[#007A5E] disabled:opacity-50"
            aria-label="Prendre une photo"
            onClick={() => setCameraOpen(true)}
            disabled={sending}
          >
            <Camera className="h-5 w-5" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              awaitingVisionNote
                ? locale === 'en'
                  ? 'Add a detail about the photo…'
                  : 'Précisez la photo (ville, région…)…'
                : 'Posez votre question…'
            }
            className="min-w-0 flex-1 border-0 shadow-none focus:ring-0"
            aria-label="Message"
            disabled={sending}
          />

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCD116] text-[#1a1a1a]"
            aria-label="Ouvrir le mode vocal"
            disabled={sending}
            onClick={openVoice}
          >
            <Mic className="h-5 w-5" />
          </button>

          <Button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Envoyer"
            className="bg-[#007A5E] hover:bg-[#00614b]"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <VisionCameraSheet
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => void analyzeVision(file)}
        busy={sending}
      />

      <VoiceMode
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        conversationId={conversationId}
        onExchange={handleVoiceExchange}
      />
    </div>
  );
}

export function AssistantPageClient({
  initialQuestion,
  autoVoice,
  autoVision,
}: {
  initialQuestion?: string;
  autoVoice?: boolean;
  autoVision?: boolean;
}) {
  return (
    <AssistantChat
      initialQuestion={initialQuestion}
      autoVoice={autoVoice}
      autoVision={autoVision}
    />
  );
}
