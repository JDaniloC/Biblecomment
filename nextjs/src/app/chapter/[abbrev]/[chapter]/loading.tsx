import { Skeleton } from "@/components/Skeleton";

export default function ChapterLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64 hidden md:block" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-baseline gap-3 mb-8">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-6 w-40" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-6 shrink-0" />
              <Skeleton className={`h-5 ${i % 3 === 0 ? "w-11/12" : i % 3 === 1 ? "w-3/4" : "w-5/6"}`} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
