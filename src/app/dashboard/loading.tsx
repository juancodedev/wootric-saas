export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}
