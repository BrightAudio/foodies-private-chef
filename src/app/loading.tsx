export default function Loading() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-cream-muted text-sm tracking-wider uppercase">Loading...</p>
      </div>
    </div>
  );
}
