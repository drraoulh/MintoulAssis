'use client';

export function IntroControls({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.65rem,env(safe-area-inset-top))] z-30">
      <button
        type="button"
        onClick={onSkip}
        className="min-h-11 min-w-[4.75rem] rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white md:text-base"
        aria-label="Passer l'introduction"
      >
        Passer →
      </button>
    </div>
  );
}
