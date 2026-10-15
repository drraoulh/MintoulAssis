'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, Volume2, VolumeX, Upload, X } from 'lucide-react';

import { PageTransition } from '@/components/motion';
import { Button, ErrorState, ThinkingDots } from '@/components/ui';
import { friendlyError, runVisionGuide } from '@/lib/api/client';
import { speakOnDevice, stopDeviceSpeech } from '@/lib/audio/tts';
import { useLocale } from '@/lib/i18n';
import type { VisionGuideResponse } from '@/lib/types';

export default function VisionPage() {
  const { t, locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionGuideResponse | null>(null);
  const [userNote, setUserNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraBusy(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);
  }, [cameraOpen]);

  const onFile = useCallback((f: File | null) => {
    setFile(f);
    setResult(null);
    setUserNote('');
    setError(null);
    setPhase(null);
    stopDeviceSpeech();
    setSpeaking(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (f) {
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  async function openCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback: native camera picker (mobile)
      nativeCameraInputRef.current?.click();
      return;
    }
    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError(
        'Impossible d’accéder à la caméra. Autorisez l’accès dans le navigateur, ou importez une image.',
      );
      // Mobile / OS camera app as last resort
      nativeCameraInputRef.current?.click();
    } finally {
      setCameraBusy(false);
    }
  }

  async function snapPhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    const shot = new File([blob], `vision-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopCamera();
    onFile(shot);
  }

  async function analyze(note?: string | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setPhase(t('vision.phaseAnalyze'));
    try {
      const res = await runVisionGuide(file, {
        locale,
        userNote: note ?? null,
      });
      setResult(res);
      setPhase(null);
    } catch (err) {
      setError(friendlyError(err));
      setResult(null);
      setPhase(null);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await analyze(null);
  }

  async function onClarify(e: FormEvent) {
    e.preventDefault();
    if (!userNote.trim()) return;
    setPhase(t('vision.phaseWrite'));
    await analyze(userNote.trim());
  }

  async function onSpeak() {
    if (!result?.message) return;
    if (speaking) {
      stopDeviceSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    try {
      await speakOnDevice(result.message, locale);
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--green-deep)] sm:text-4xl">
          {t('vision.title')}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Prenez une photo ou importez une image pour obtenir un guide SmartMboa.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
        >
          {cameraOpen ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-[70vh] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-white"
                  aria-label="Fermer la caméra"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" size="lg" onClick={() => void snapPhoto()}>
                  <Camera className="h-5 w-5" aria-hidden />
                  Capturer
                </Button>
                <Button type="button" variant="outline" onClick={stopCamera}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition sm:py-12 ${
                dragging
                  ? 'border-[var(--gold)] bg-[var(--mint-soft)]'
                  : 'border-[var(--line)] bg-[var(--ivory)]'
              }`}
            >
              <Camera className="h-10 w-10 text-[var(--green)]" aria-hidden />
              <p className="mt-3 font-semibold text-[var(--green-deep)]">
                Prendre une photo ou importer une image
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Caméra en direct, ou fichier JPG / PNG / WebP (max ~5 Mo).
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  disabled={cameraBusy || loading}
                  onClick={() => void openCamera()}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--green-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {cameraBusy ? 'Ouverture…' : 'Prendre une photo'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--green-deep)]"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Choisir une image
                </button>
              </div>
              {/* Gallery / files — no capture so OS shows the library */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              {/* Native camera app (phones) when getUserMedia fails */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {preview && !cameraOpen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Aperçu de la photo à analyser"
              className="max-h-80 w-full rounded-2xl object-contain"
            />
          ) : null}

          {!cameraOpen ? (
            <Button type="submit" disabled={!file || loading} size="lg" className="w-full sm:w-auto">
              {loading ? t('assistant.thinking') : t('vision.cta')}
            </Button>
          ) : null}
        </form>

        {loading ? (
          <div className="mt-6">
            <ThinkingDots label={phase || 'Analyse en cours…'} />
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 space-y-2">
            <ErrorState message={error} />
            <p className="text-sm text-[var(--muted)]">{t('vision.fail')}</p>
          </div>
        ) : null}

        {result?.status === 'needs_clarification' ? (
          <form
            onSubmit={onClarify}
            className="mt-8 space-y-3 rounded-2xl border border-[var(--gold)]/40 bg-[#fffdf5] p-5"
          >
            <h2 className="font-display text-xl font-semibold text-[var(--green-deep)]">
              Besoin d’une précision
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {result.clarifying_question ||
                'Pouvez-vous préciser la ville ou la région de cette photo ?'}
            </p>
            {result.analysis?.short_description ? (
              <p className="rounded-xl bg-white/80 px-3 py-2 text-sm">
                {result.analysis.short_description}
                {typeof result.confidence === 'number' ? (
                  <span className="ml-2 text-[var(--muted)]">
                    (confiance {Math.round(result.confidence * 100)} %)
                  </span>
                ) : null}
              </p>
            ) : null}
            <label className="block text-sm font-medium text-[var(--green-deep)]" htmlFor="vision-note">
              Votre précision
            </label>
            <input
              id="vision-note"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Ex. : près de Kribi, plage ; ou monument à Yaoundé…"
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/30"
            />
            <Button type="submit" disabled={!userNote.trim() || loading}>
              {t('vision.continueAnalyze')}
            </Button>
          </form>
        ) : null}

        {result?.status === 'ok' && result.message ? (
          <div className="mt-8 space-y-4">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[var(--green-deep)]">
                    Guide Vision
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {result.is_cameroon
                      ? 'Lieu probablement au Cameroun'
                      : 'Lieu hors Cameroun (pas d’histoire inventée)'}
                    {typeof result.confidence === 'number'
                      ? ` · confiance ${Math.round(result.confidence * 100)} %`
                      : ''}
                    {result.model ? ` · ${result.model}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onSpeak()}
                  aria-pressed={speaking}
                >
                  {speaking ? (
                    <>
                      <VolumeX className="h-4 w-4" aria-hidden />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" aria-hidden />
                      Écouter
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-[var(--ink)]">{result.message}</p>
            </section>

            {result.sources?.length ? (
              <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <h3 className="font-display text-lg font-semibold text-[var(--green-deep)]">
                  Sources web
                </h3>
                <ul className="mt-3 space-y-3">
                  {result.sources.map((s) => (
                    <li key={s.url} className="text-sm">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[var(--green)] underline"
                      >
                        {s.title}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                      {s.snippet ? (
                        <p className="mt-0.5 text-[var(--muted)]">{s.snippet}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : result.is_cameroon ? (
              <p className="text-sm text-[var(--muted)]">
                Aucune source web solide trouvée — la réponse s’appuie sur l’analyse visuelle.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button href="/assistant" variant="secondary">
                {t('vision.continueAssistant')}
              </Button>
              <Button href="/explorer" variant="outline">
                {t('culture.explore')}
              </Button>
              <Link
                href="/vision"
                className="inline-flex items-center rounded-full px-4 py-2 text-sm text-[var(--muted)] underline"
                onClick={() => onFile(null)}
              >
                Nouvelle photo
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
