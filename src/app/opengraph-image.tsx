import { ImageResponse } from 'next/og';

import { APP_NAME, APP_TAGLINE_FR } from '@/lib/config';

export const runtime = 'edge';
export const alt = `${APP_NAME} — ${APP_TAGLINE_FR}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Open Graph / Twitter share card — Cameroon green + gold accent. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background:
            'linear-gradient(135deg, #005C46 0%, #007A5E 45%, #0A4D3C 100%)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 999,
              background: '#007A5E',
              border: '5px solid #FCD116',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 54,
                height: 40,
                borderRadius: 14,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#007A5E',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#007A5E',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
              {APP_NAME}
            </div>
            <div style={{ fontSize: 22, color: '#FCD116', fontWeight: 600 }}>
              Mintoul · Cameroun
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: 920,
              letterSpacing: -1.2,
            }}
          >
            Découvrez le Cameroun avec un guide IA
          </div>
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.88)',
              maxWidth: 840,
              lineHeight: 1.35,
            }}
          >
            Sites, itinéraires, assistant vocal et Vision — pour préparer votre
            voyage.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <span>smartmboatour.com</span>
          <span style={{ color: '#FCD116', fontWeight: 700 }}>
            Guide · Vocal · Vision
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
