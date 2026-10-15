import { NextResponse } from 'next/server';

import { hfApiKey, speechProvider, transcribeWithHuggingFace } from '@/lib/speech/hf-asr';
import { transcribeWithOpenRouter } from '@/lib/speech/openrouter-asr';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 8_000_000;

/** Formats accepted by OpenRouter input_audio (fallback path). */
function openRouterFormat(mime: string, filename: string): string | null {
  const m = (mime || '').toLowerCase();
  const f = (filename || '').toLowerCase();
  if (m.includes('wav') || f.endsWith('.wav')) return 'wav';
  if (m.includes('mp3') || m.includes('mpeg') || f.endsWith('.mp3')) return 'mp3';
  if (m.includes('aiff') || f.endsWith('.aiff') || f.endsWith('.aif')) return 'aiff';
  if (m.includes('aac') || f.endsWith('.aac')) return 'aac';
  if (m.includes('ogg') || f.endsWith('.ogg')) return 'ogg';
  if (m.includes('flac') || f.endsWith('.flac')) return 'flac';
  return null;
}

function errMeta(e: unknown): { message: string; code?: string; status?: number } {
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; code?: unknown; status?: unknown };
    const rawMsg =
      typeof o.message === 'string'
        ? o.message
        : o.message
          ? JSON.stringify(o.message)
          : 'Erreur de transcription';
    return {
      message: rawMsg,
      code: typeof o.code === 'string' ? o.code : undefined,
      status: typeof o.status === 'number' ? o.status : undefined,
    };
  }
  return { message: e instanceof Error ? e.message : String(e || 'Erreur de transcription') };
}

/**
 * Speech-to-text:
 * 1) Hugging Face Whisper (preferred — no OpenRouter audio credit floor)
 * 2) OpenRouter multimodal (fallback if HF fails / missing)
 *
 * Body: multipart form field `file` (audio blob, ideally WAV).
 */
export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { detail: 'Format de requête invalide (multipart attendu).' },
        { status: 400 },
      );
    }
    const file = form.get('file');
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ detail: 'Aucun audio reçu.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { detail: 'Enregistrement trop lourd. Parlez plus brièvement.' },
        { status: 400 },
      );
    }

    const mime = (file.type || 'audio/wav').split(';')[0] || 'audio/wav';
    const filename =
      file instanceof File && file.name ? file.name : 'recording.wav';
    const buf = Buffer.from(await file.arrayBuffer());

    const errors: string[] = [];
    const prefer = speechProvider();

    // --- 1) Hugging Face Whisper (default when SPEECH_PROVIDER=huggingface) ---
    if (prefer !== 'openrouter' && hfApiKey()) {
      try {
        const result = await transcribeWithHuggingFace(buf, mime);
        let text = result.text.trim();
        if (!text || /^\(?inaudible\)?$/i.test(text)) {
          return NextResponse.json({ text: '', language: null, provider: result.provider });
        }
        return NextResponse.json({ text, language: null, provider: result.provider });
      } catch (e) {
        const meta = errMeta(e);
        console.error('[speech/transcribe] HF', meta.message.slice(0, 300));
        errors.push(`HF: ${meta.message}`);
        if (meta.code === 'HF_LOADING') {
          return NextResponse.json({ detail: meta.message }, { status: 503 });
        }
      }
    } else if (prefer !== 'openrouter') {
      errors.push('HF: HUGGINGFACE_HUB_TOKEN absente');
    }

    // --- 2) OpenRouter (needs audio credits) ---
    const format = openRouterFormat(mime, filename);
    if (format && process.env.OPENROUTER_API_KEY?.trim()) {
      try {
        const result = await transcribeWithOpenRouter(buf.toString('base64'), format);
        let text = result.text.trim();
        text = text.replace(/^["«]|["»]$/g, '').trim();
        if (!text || /^\(?inaudible\)?$/i.test(text)) {
          return NextResponse.json({ text: '', language: null, provider: result.provider });
        }
        return NextResponse.json({ text, language: null, provider: result.provider });
      } catch (e) {
        const meta = errMeta(e);
        console.error('[speech/transcribe] OpenRouter', meta.message.slice(0, 300));
        errors.push(`OpenRouter: ${meta.message}`);
        if (meta.code === 'OR_CREDITS' || meta.status === 402) {
          return NextResponse.json(
            {
              detail:
                'OpenRouter refuse l’audio (crédit insuffisant). Vérifiez HUGGINGFACE_HUB_TOKEN, ou utilisez Chrome (reconnaissance navigateur).',
              errors,
            },
            { status: 402 },
          );
        }
      }
    } else if (!format) {
      errors.push('OpenRouter: format non supporté (attendu wav/mp3/ogg/flac)');
    } else {
      errors.push('OpenRouter: clé absente');
    }

    const needsHf = !hfApiKey();
    return NextResponse.json(
      {
        detail: needsHf
          ? 'Transcription serveur indisponible : ajoutez HUGGINGFACE_HUB_TOKEN dans .env.local (Whisper). Sur Chrome, le mode vocal peut utiliser la reconnaissance du navigateur.'
          : 'Transcription indisponible pour le moment. Réessayez ou écrivez dans le chat.',
        errors,
      },
      { status: 503 },
    );
  } catch (e) {
    console.error('[speech/transcribe]', e instanceof Error ? e.message : e);
    return NextResponse.json(
      { detail: 'Erreur de transcription. Réessayez.' },
      { status: 502 },
    );
  }
}
