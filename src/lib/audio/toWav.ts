/**
 * Convert a MediaRecorder blob (webm/mp4/ogg) to mono 16-bit PCM WAV.
 * OpenRouter / Gemini input_audio accepts wav, mp3, aiff, aac, ogg, flac — not webm.
 */

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += ch[i];
  }
  const inv = 1 / numberOfChannels;
  for (let i = 0; i < length; i++) out[i] *= inv;
  return out;
}

function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

/** Decode any browser-recorded audio blob into a WAV Blob (mono, 16 kHz). */
export async function blobToWavBlob(
  blob: Blob,
  targetSampleRate = 16_000,
): Promise<Blob> {
  const AC =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (
          globalThis as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
  if (!AC) {
    throw new Error('AudioContext indisponible dans ce navigateur.');
  }
  const ctx = new AC();
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => undefined);
    }
    const ab = await blob.arrayBuffer();
    // copy: decodeAudioData may detach the buffer
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      const res = ctx.decodeAudioData(ab.slice(0), resolve, reject);
      if (res && typeof res.then === 'function') {
        res.then(resolve, reject);
      }
    });
    const mono = mixToMono(decoded);
    const resampled = resampleLinear(mono, decoded.sampleRate, targetSampleRate);
    const wav = encodeWavPcm16(resampled, targetSampleRate);
    return new Blob([wav], { type: 'audio/wav' });
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
