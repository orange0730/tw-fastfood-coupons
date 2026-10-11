import { CircleCheck } from 'lucide-react';

export default function Toast({ message }: { message: string | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none">
      {message && (
        <div className="fixed bottom-20 left-1/2 z-50 flex animate-toast-in items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-stone-900/20 lg:bottom-8 dark:bg-white dark:text-stone-900">
          <CircleCheck className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          {message}
        </div>
      )}
    </div>
  );
}
