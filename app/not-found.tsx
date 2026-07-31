import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="surface max-w-md p-8 text-center">
        <p className="eyebrow">Wrong turn</p>
        <h1 className="display mt-3 text-4xl">Nothing here, mate.</h1>
        <p className="mt-3 text-[var(--chalk-muted)]">Check the link and have another crack.</p>
        <Link href="/" className="button button-primary mt-6">Head back</Link>
      </div>
    </main>
  );
}
