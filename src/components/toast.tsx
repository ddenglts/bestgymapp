'use client';

type ToastProps = {
  message: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-red-400/50 bg-red-500/40 px-4 py-3 text-sm text-white backdrop-blur">
        <span className="flex-1 text-center font-medium tracking-tight text-white/90">
          {message}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Close
        </button>
      </div>
    </div>
  );
}
