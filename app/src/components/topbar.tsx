import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center bg-background px-6">
      <Link
        href="/"
        aria-label="Tacta, home"
        className="rounded-sm text-2xl leading-none tracking-[0.2em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* "tacta" in braille. The wordmark is the braille alone, no Latin text. */}
        <span aria-hidden="true">⠞⠁⠉⠞⠁</span>
      </Link>
    </header>
  );
}
