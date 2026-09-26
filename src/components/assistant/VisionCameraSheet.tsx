'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  busy?: boolean;
};

/**
 * Live camera overlay — captures a still photo (Vision analyzes images, not video).
 */
export function VisionCameraSheet({ open, onClose, onCapture, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const close = useCallback(() => {
    stop();
    setError(null);
    onClose();
  }, [onClose, stop]);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    let cancelled = false;
    setStarting(true);
    setError(null);

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Caméra non disponible dans ce navigateur. Importez une image à la place.',
        );
        setStarting(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setError(
            'Impossible d’accéder à la caméra. Autorisez l’accès dans le navigateur, ou importez une image.',
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop]);

  // Re-attach stream when video mounts after open
  useEffect(() => {
    if (!open || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);
  }, [open, starting]);

  async function snap() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
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
    const shot = new File([blob], `vision-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    stop();
    onCapture(shot);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Caméra Vision"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-semibold">Prendre une photo</p>
        <button
          type="button"
          onClick={close}
          className="rounded-full bg-white/15 p-2"
          aria-label="Fermer"
          disabled={busy}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-3">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-white">
            <p className="text-sm text-white/90">{error}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => galleryRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden />
              Importer une image
            </Button>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full max-h-[70vh] w-full object-cover"
            />
            {starting ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                Ouverture de la caméra…
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 py-5">
          {!error ? (
            <Button
              type="button"
              size="lg"
              onClick={() => void snap()}
              disabled={starting || busy}
            >
              <Camera className="h-5 w-5" aria-hidden />
              Capturer
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Galerie
          </Button>
          <Button type="button" variant="ghost" className="text-white" onClick={close}>
            Annuler
          </Button>
        </div>
        <p className="pb-4 text-center text-xs text-white/60">
          Vision analyse une photo (pas une vidéo). Autorisez la caméra si le navigateur le demande.
        </p>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          stop();
          onCapture(f);
          onClose();
        }}
      />
    </div>
  );
}
