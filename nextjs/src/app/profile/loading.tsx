import { BadgeIcon } from "@/components/BadgeIcon";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-amber-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 dark:border-b dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="shimmer-skeleton h-5 w-20" />
          <div className="shimmer-skeleton h-6 w-24" />
          <div className="shimmer-skeleton h-5 w-16" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Profile header card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-700 p-6 flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #fde68a 0%, #fca5a5 70%, #fb7185 100%)",
              opacity: 0.7,
            }}
            aria-hidden="true"
          />
          <div className="flex-1 space-y-2">
            <div className="shimmer-skeleton h-5 w-1/3" />
            <div className="shimmer-skeleton h-4 w-1/2" />
          </div>
        </div>

        {/* Stat cards with lucide icon placeholders */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { icon: "Trophy",         color: "#d4a017" },
              { icon: "BookOpen",       color: "#0d9488" },
              { icon: "MessageCircle",  color: "#4f46e5" },
            ] as const
          ).map((it, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-700 p-4 text-center space-y-2 flex flex-col items-center"
            >
              <div
                className="opacity-30 animate-pulse"
                style={{ color: it.color }}
                aria-hidden="true"
              >
                <BadgeIcon name={it.icon} width={22} height={22} />
              </div>
              <div className="shimmer-skeleton h-3 w-2/3 mx-auto" />
            </div>
          ))}
        </div>

        {/* Tabs row */}
        <div className="flex gap-2 border-b border-amber-200/60 dark:border-slate-700">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer-skeleton h-8 w-24" />
          ))}
        </div>

        {/* Content cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-700 p-4 space-y-2"
            >
              <div className="shimmer-skeleton h-4 w-1/4" />
              <div className="shimmer-skeleton h-4 w-full" />
              <div className="shimmer-skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
