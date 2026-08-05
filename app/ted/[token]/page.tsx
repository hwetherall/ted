import Image from "next/image";
import { notFound } from "next/navigation";
import { TedTeamSheet } from "@/components/ted-team-sheet";
import ladsPhoto from "@/images/lads.jpg";
import { getTedTeamSheet } from "@/lib/ted/team-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Team sheet",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TedPage({ params }: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const entries = await getTedTeamSheet(token);
  if (!entries) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-9 sm:px-5 sm:py-16">
      <header>
        <p className="eyebrow">Team sheet</p>
        <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">Pick your people.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--chalk-muted)]">
          The Old Geelong selection committee is back for one final job, thankfully with less running. Add everyone you want there, one mate at a time. If they&apos;re on the team sheet, they&apos;re invited.
        </p>

        <figure className="mt-8 w-full max-w-[26rem] -rotate-1 rounded-md bg-[#e8e0cf] p-2 pb-3 shadow-[0_20px_55px_rgba(4,9,7,0.42)] sm:mt-10">
          <Image
            src={ladsPhoto}
            alt="Four Old Geelong mates together"
            className="h-auto w-full rounded-[0.15rem]"
            sizes="(max-width: 448px) calc(100vw - 3rem), 416px"
            priority
          />
          <figcaption className="mono px-1 pt-3 text-[0.67rem] uppercase tracking-[0.12em] text-[#354039]">
            The original team sheet
          </figcaption>
        </figure>

        <p className="mono mt-5 text-sm text-[var(--gold-light)]" aria-live="polite">
          {entries.length} {entries.length === 1 ? "person" : "people"} on the team sheet
        </p>
      </header>

      <TedTeamSheet token={token} entries={entries} />
    </main>
  );
}
