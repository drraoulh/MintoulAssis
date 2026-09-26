'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CameroonMapIntro } from '@/components/intro/CameroonMapIntro';
import { IntroControls } from '@/components/intro/IntroControls';
import { IntroText, ReducedIntroCopy } from '@/components/intro/IntroText';
import { bindHapticsGestureUnlock, introHaptic, triggerHaptic, unlockHaptics } from '@/lib/haptics';
import {
  AUTO_PHASES,
  holdAfter,
  markIntroSeen,
  type IntroPhase,
} from '@/lib/intro';

export { INTRO_STORAGE_KEY, hasSeenIntro } from '@/lib/intro';

const EASE = [0.22, 1, 0.36, 1] as const;

const PHASE_HAPTIC: Partial<Record<IntroPhase, Parameters<typeof introHaptic>[0]>> = {
  INTRO: 'breath',
  REGION_NORTH: 'tap',
  REGION_WEST: 'tap',
  REGION_CENTER: 'soft',
  REGION_COAST: 'flow',
  CULTURES: 'micro',
  UNIFICATION: 'unify',
  AFRICA_MINIATURE: 'fade',
  CAMEROON: 'final',
};

export function SmartMboaIntro({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  // Never skip the cinematic — Windows "reduce motion" was freezing the intro.
  const reduce = false;
  const faster = !!reduceMotion;

  const [phase, setPhase] = useState<IntroPhase>('INTRO');
  const [visible, setVisible] = useState(true);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finishingRef = useRef(false);
  const phaseRef = useRef<IntroPhase>('INTRO');
  const holdTimerRef = useRef<number | undefined>(undefined);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== undefined) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
    }
  }, []);

  const exitToHome = useCallback(
    (immediate = false) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      clearHold();
      markIntroSeen();
      setPhase('EXITING');

      const ms = immediate || reduce ? 320 : 900;
      window.setTimeout(() => {
        setPhase('DONE');
        setVisible(false);
        onCompleteRef.current();
      }, ms);
    },
    [clearHold, reduce],
  );

  const skip = useCallback(() => {
    unlockHaptics();
    triggerHaptic('medium');
    exitToHome(true);
  }, [exitToHome]);

  const goNext = useCallback(
    (from: IntroPhase) => {
      if (finishingRef.current) return;
      if (phaseRef.current !== from) return;

      clearHold();
      const idx = AUTO_PHASES.indexOf(from);
      const next = AUTO_PHASES[idx + 1];
      // After the last brand lines, go straight to home — no CTA button.
      if (!next || next === 'READY' || from === 'BRAND') {
        const delay = faster ? 500 : holdAfter('BRAND');
        holdTimerRef.current = window.setTimeout(() => {
          if (finishingRef.current) return;
          exitToHome(false);
        }, delay);
        return;
      }

      const delay = faster ? 400 : holdAfter(from);
      holdTimerRef.current = window.setTimeout(() => {
        if (finishingRef.current || phaseRef.current !== from) return;
        phaseRef.current = next;
        setPhase(next);
        const haptic = PHASE_HAPTIC[next];
        if (haptic) introHaptic(haptic);
        if (next === 'CULTURES') {
          window.setTimeout(() => introHaptic('micro'), 500);
          window.setTimeout(() => introHaptic('micro'), 950);
        }
      }, delay);
    },
    [clearHold, exitToHome, faster],
  );

  useEffect(() => {
    if (phase === 'INTRO' || phase === 'EXITING' || phase === 'DONE' || phase === 'READY') {
      return;
    }
    const t = window.setTimeout(() => goNext(phase), 8000);
    return () => clearTimeout(t);
  }, [goNext, phase]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const onTyped = useCallback(
    (forPhase: IntroPhase) => {
      goNext(forPhase);
    },
    [goNext],
  );

  // Any touchstart / click / pointerdown anywhere unlocks vibrate (Android).
  // iOS has no Vibration API — this is a no-op there.
  useEffect(() => {
    return bindHapticsGestureUnlock();
  }, []);

  // Boot INTRO → first region. Empty deps: do not reset the sequence on remount
  // or when prefers-reduced-motion hydrates. Strict Mode cleanup just cancels
  // this timer; the second mount starts a fresh one.
  useEffect(() => {
    introHaptic('breath');
    const t = window.setTimeout(() => {
      if (finishingRef.current) return;
      if (phaseRef.current !== 'INTRO') return;
      goNextRef.current('INTRO');
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="intro-shell bg-[#050505]"
          initial={{ opacity: 1 }}
          animate={
            phase === 'EXITING'
              ? { opacity: 0, scale: 1.06, filter: 'blur(12px)' }
              : { opacity: 1, scale: 1, filter: 'blur(0px)' }
          }
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.25 : 0.9, ease: EASE }}
          role="dialog"
          aria-label="Introduction SmartMboa — Cameroun"
          onPointerDown={unlockHaptics}
          onTouchStart={unlockHaptics}
          onClick={unlockHaptics}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 42%, rgba(0,122,94,0.35) 0%, rgba(5,5,5,0.92) 70%, #050505 100%)',
            }}
          />
          {/* Soft flag wash */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-80"
            style={{
              background: 'linear-gradient(90deg, #007A5E 0%, #CE1126 50%, #FCD116 100%)',
            }}
            aria-hidden
          />

          <IntroControls onSkip={skip} />

          <div className="intro-stage">
            {reduce ? (
              <ReducedIntroCopy />
            ) : (
              <>
                <CameroonMapIntro phase={phase} reduce={false} />
                <IntroText phase={phase} reduce={false} onTyped={onTyped} />
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ImmersiveWelcome({ onComplete }: { onComplete: () => void }) {
  return <SmartMboaIntro onComplete={onComplete} />;
}
