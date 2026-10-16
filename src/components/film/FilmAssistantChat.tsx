'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Clapperboard,
  Film,
  Mic,
  SendHorizontal,
  Square,
  Theater,
  Trophy,
  Users,
  Volume2,
} from 'lucide-react';

import { CollapsibleSources } from '@/components/assistant/CollapsibleSources';
import { MarkdownContent } from '@/components/assistant/MarkdownContent';
import { AssistantMark } from '@/components/brand/AssistantMark';
import { ThinkingDots } from '@/components/ui';
import {
  friendlyError,
  sendFilmChatMessage,
  synthesizeSpeech,
} from '@/lib/api/client';
import { audioPlayback } from '@/lib/audio/playback';
import { speakOnDevice, splitForSpeech, stopDeviceSpeech } from '@/lib/audio/tts';
import { useLocale } from '@/lib/i18n';
import type { SourceUI } from '@/lib/types';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceUI[];
  isError?: boolean;
}

const SUGGESTIONS = [
  {
    icon: Users,
    labelKey: 'film.assistant.sug.filmmaker',
    qKey: 'film.assistant.sug.filmmakerQ',
  },
  {
    icon: Film,
    labelKey: 'film.assistant.sug.film',
    qKey: 'film.assistant.sug.filmQ',
  },
  {
    icon: Trophy,
    labelKey: 'film.assistant.sug.festival',
    qKey: 'film.assistant.sug.festivalQ',
  },
  {
    icon: Theater,
    labelKey: 'film.assistant.sug.premiere',
    qKey: 'film.assistant.sug.premiereQ',
  },
  {
    icon: Clapperboard,
    labelKey: 'film.assistant.sug.produce',
    qKey: 'film.assistant.sug.produceQ',
  },
] as const;

export function FilmAssistantChat({
  initialQuestion,
}: {
  initialQuestion?: string;
}) {
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const ttsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => audioPlayback.subscribe(setAudioPlaying), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const stopAllAudio = useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    stopDeviceSpeech();
    audioPlayback.stop();
    setSpeakingMsgId(null);
  }, []);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    stopAllAudio();
    setSending(true);
    setMessages((m) => [
      ...m,
      { id: `${Date.now()}-u`, role: 'user', content: trimmed },
    ]);
    setInput('');
    try {
      const res = await sendFilmChatMessage({
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
          sources: res.ui_sources ?? undefined,
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
    if (started.current || !initialQuestion) return;
    started.current = true;
    void ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  async function speakMessage(msg: Msg) {
    const text = msg.content?.trim();
    if (!text || msg.isError) return;
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
    } catch {
      try {
        await speakOnDevice(text, locale);
      } catch {
        /* ignore */
      }
    } finally {
      if (ttsAbortRef.current === abort) ttsAbortRef.current = null;
      setSpeakingMsgId((id) => (id === msg.id ? null : id));
    }
  }

  useEffect(() => () => stopAllAudio(), [stopAllAudio]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a] text-[#F8F5ED]">
      <header className="shrink-0 border-b border-white/10 bg-[#0f0f0f] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CE1126]/20">
            <Clapperboard className="h-5 w-5 text-[#FCD116]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold text-[#F8F5ED] sm:text-xl">
              {t('film.assistant.title')}
            </h1>
            <p className="truncate text-xs text-white/50 sm:text-sm">
              {t('film.assistant.sub')}
            </p>
          </div>
          {(audioPlaying || speakingMsgId) && (
            <button
              type="button"
              onClick={stopAllAudio}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#CE1126] px-3 py-2 text-xs font-semibold text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              Stop
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
        {messages.length === 0 && !sending ? (
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <AssistantMark size="lg" className="mx-auto opacity-90" />
              <p className="mt-5 font-display text-2xl font-bold tracking-tight text-[#F8F5ED] sm:text-4xl">
                {t('film.assistant.hero')}{' '}
                <span className="text-[#FCD116]">{t('film.assistant.heroAccent')}</span>
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/55 sm:text-base">
                {t('film.assistant.heroSub')}
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.labelKey}
                  type="button"
                  onClick={() => void ask(t(s.qKey))}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#FCD116]/40"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#CE1126]/25">
                    <s.icon className="h-5 w-5 text-[#FCD116]" aria-hidden />
                  </span>
                  <span className="block text-sm font-semibold text-[#F8F5ED]">
                    {t(s.labelKey)}
                  </span>
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                {msg.role === 'user' ? t('assistant.you') : t('film.assistant.bot')}
              </p>
              {msg.role === 'assistant' && !msg.isError ? (
                <button
                  type="button"
                  onClick={() => void speakMessage(msg)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#FCD116] hover:bg-white/5"
                  aria-label={t('film.assistant.speak')}
                >
                  {speakingMsgId === msg.id ? (
                    <Mic className="h-3 w-3 animate-pulse" aria-hidden />
                  ) : (
                    <Volume2 className="h-3 w-3" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
            <div
              className={
                msg.role === 'user'
                  ? 'rounded-2xl rounded-br-md bg-[#CE1126] px-4 py-3 text-sm text-white'
                  : msg.isError
                    ? 'rounded-2xl border border-[#CE1126]/40 bg-[#CE1126]/10 px-4 py-3 text-sm text-[#F8F5ED]'
                    : 'rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F8F5ED]'
              }
            >
              {msg.role === 'assistant' && !msg.isError ? (
                <div className="space-y-4">
                  <MarkdownContent content={msg.content} variant="onDark" />
                  {msg.sources?.length ? (
                    <CollapsibleSources sources={msg.sources} />
                  ) : null}
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {sending ? (
          <div className="mr-auto rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <ThinkingDots />
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-white/10 bg-[#0f0f0f] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl items-end gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('film.assistant.placeholder')}</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder={t('film.assistant.placeholder')}
              className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35 focus:border-[#FCD116]/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
            />
          </label>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CE1126] text-white disabled:opacity-40"
            aria-label={t('film.assistant.send')}
          >
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
