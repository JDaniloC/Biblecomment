import { Skeleton } from "@/components/Skeleton";

export default function UsersLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 dark:border-b dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-4 gap-4 items-center">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2 hidden sm:block" />
                <Skeleton className="h-4 w-1/2 hidden sm:block" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
