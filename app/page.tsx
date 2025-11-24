export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-xl p-6 space-y-4">
        <h1 className="text-3xl font-bold">Kyes</h1>
        <p className="text-sm">
          L&apos;app qui t&apos;évite les blancs en soirée : crée un événement,
          invite les gens et vois enfin qui est qui.
        </p>
        <a
          href="/login"
          className="inline-block mt-2 border rounded-md px-4 py-2 text-sm font-medium"
        >
          Accéder à Kyes
        </a>
      </div>
    </main>
  );
}
