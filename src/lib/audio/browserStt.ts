/**
 * Browser SpeechRecognition (Chrome / Edge) — free local STT.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function browserSttAvailable(): boolean {
  return !!getSpeechRecognitionCtor();
}

export type BrowserSttSession = {
  /** Stop listening and resolve with whatever was captured. */
  stop: () => void;
  /** Abort without using the transcript. */
  abort: () => void;
  done: Promise<string>;
};

/**
 * Start one browser speech-recognition session.
 * Speak, then call `stop()` (or wait for natural end / timeout).
 */
export function startBrowserStt(opts?: {
  lang?: string;
  timeoutMs?: number;
}): BrowserSttSession {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      stop: () => undefined,
      abort: () => undefined,
      done: Promise.reject(new Error('Reconnaissance vocale navigateur indisponible.')),
    };
  }

  const lang = opts?.lang || 'fr-FR';
  const timeoutMs = opts?.timeoutMs ?? 25_000;
  let rec: SpeechRecognitionLike | null = new Ctor();
  let finalText = '';
  let settled = false;
  let resolveDone!: (t: string) => void;
  let rejectDone!: (e: Error) => void;

  const done = new Promise<string>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const settleOk = (text: string) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveDone(text.trim());
  };

  const settleErr = (err: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    rejectDone(err);
  };

  const stopRec = (mode: 'stop' | 'abort') => {
    try {
      if (!rec) return;
      if (mode === 'abort') rec.abort();
      else rec.stop();
    } catch {
      /* ignore */
    }
  };

  const timer = window.setTimeout(() => {
    stopRec('stop');
    // onend will settle; safety:
    window.setTimeout(() => settleOk(finalText), 400);
  }, timeoutMs);

  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      const t = r?.[0]?.transcript || '';
      if (r.isFinal) finalText += `${t} `;
    }
  };

  rec.onerror = (ev) => {
    const code = ev.error || 'error';
    if (code === 'no-speech' || code === 'aborted') {
      settleOk(finalText);
      return;
    }
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      settleErr(new Error('Micro non autorisé pour la reconnaissance vocale.'));
      return;
    }
    // network / other — still return what we have if any
    if (finalText.trim()) settleOk(finalText);
    else settleErr(new Error(`Reconnaissance vocale : ${code}`));
  };

  rec.onend = () => {
    settleOk(finalText);
    rec = null;
  };

  try {
    rec.start();
  } catch (e) {
    settleErr(e instanceof Error ? e : new Error('Impossible de démarrer la reconnaissance.'));
  }

  return {
    stop: () => {
      stopRec('stop');
      window.setTimeout(() => settleOk(finalText), 500);
    },
    abort: () => {
      stopRec('abort');
      settleOk('');
    },
    done,
  };
}
