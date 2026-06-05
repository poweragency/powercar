import { Skeleton } from "@/components/ui/Skeleton";

export default function TeamLoading() {
  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-44" />
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-72 mt-2" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
