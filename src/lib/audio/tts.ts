/** Strip markdown / markup so TTS does not speak "dièse" or stars. */
export function cleanForSpeech(text: string): string {
  return (
    text
      .replace(/\r\n/g, '\n')
      // fenced code
      .replace(/```[\s\S]*?```/g, ' ')
      // images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // links [label](url) → label
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // headings ### Title → Title
      .replace(/^#{1,6}\s+/gm, '')
      // bold / italic / strike
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`+/g, '')
      // list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // blockquote
      .replace(/^\s*>\s?/gm, '')
      // leftover emphasis chars
      .replace(/[*#_~|]+/g, ' ')
      // collapse whitespace but keep sentence pauses
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([.!?])\s*\./g, '$1')
      .trim()
  );
}

/** Split long answers so HTTP TTS stays under request limits. */
const MAX_SEGMENT_CHARS = 160;
const FIRST_SEGMENT_CHARS = 72;

export function splitForSpeech(text: string): string[] {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return [];
  const sentences = cleaned.match(/[^.!?…]+[.!?…]*/g) ?? [cleaned];
  const segments: string[] = [];
  let current = '';
  let isFirst = true;

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    const limit = isFirst ? FIRST_SEGMENT_CHARS : MAX_SEGMENT_CHARS;
    if (!current) {
      current = piece;
    } else if (current.length + piece.length + 1 <= limit) {
      current = `${current} ${piece}`;
    } else {
      segments.push(current);
      isFirst = false;
      current = piece;
    }
    if (isFirst && current.length >= FIRST_SEGMENT_CHARS) {
      const cut = current.lastIndexOf(' ', FIRST_SEGMENT_CHARS);
      if (cut >= 20) {
        segments.push(current.slice(0, cut).trim());
        current = current.slice(cut).trim();
        isFirst = false;
      }
    }
  }
  if (current) segments.push(current);
  return segments;
}

export function speakOnDevice(text: string, locale: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.lang = locale.toLowerCase().startsWith('en') ? 'en-US' : 'fr-FR';
    utterance.rate = 0.98;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopDeviceSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
