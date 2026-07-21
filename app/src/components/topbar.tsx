import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center bg-background px-4 sm:px-6">
      {/* Same centered max-w-xl column as the page content, so the braille
          wordmark left-aligns with the page heading below it. */}
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          aria-label="Tacta, home"
          className="inline-block rounded-sm text-2xl leading-none tracking-[0.2em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* "tacta" in braille. The wordmark is the braille alone. */}
          <span aria-hidden="true">⠞⠁⠉⠞⠁</span>
        </Link>
      </div>
    </header>
  );
}
