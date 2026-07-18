import Link from "next/link";

// Braille wordmark for TACTA (⠞⠁⠉⠞⠁) — the project's name, and a fitting mark
// for a device that speaks in touch. Rendered as the brand in place of a logo.
const WORDMARK = "⠞ ⠁ ⠉ ⠞ ⠁";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-6">
      <Link href="/" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h1 className="sr-only">tacta</h1>
        <span aria-hidden="true" className="select-none text-base text-foreground">
          {WORDMARK}
        </span>
      </Link>
    </header>
  );
}
