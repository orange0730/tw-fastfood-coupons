export default function CouponCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="aspect-[4/3] animate-pulse bg-stone-200 dark:bg-stone-800" />
      <div className="animate-pulse space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="h-3 w-16 rounded bg-stone-200 dark:bg-stone-800" />
        </div>
        <div className="h-4 w-11/12 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-7 w-24 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-11 w-full rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    </div>
  );
}
