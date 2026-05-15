export default function Loading() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <div className="h-6 w-32 bg-bg-hover rounded" />
        <div className="ml-auto h-9 w-64 bg-bg-hover rounded" />
      </div>
      <div className="p-6 flex-1">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`h${i}`} className="bg-bg-card h-8" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={`c${i}`} className="bg-bg-card min-h-[110px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
