export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-8 animate-pulse">
      <div className="h-4 w-32 bg-bg-hover rounded mb-4" />
      <div className="h-8 w-72 bg-bg-hover rounded mb-2" />
      <div className="h-4 w-48 bg-bg-hover rounded mb-6" />
      <div className="space-y-4">
        <div className="h-24 bg-bg-card border border-border rounded-lg" />
        <div className="h-80 bg-bg-card border border-border rounded-lg" />
        <div className="h-32 bg-bg-card border border-border rounded-lg" />
      </div>
    </div>
  );
}
