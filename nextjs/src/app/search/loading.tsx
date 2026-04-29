import { Skeleton } from "@/components/Skeleton";

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 dark:border-b dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
