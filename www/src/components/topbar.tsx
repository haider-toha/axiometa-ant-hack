import Image from "next/image";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-6">
      <Link href="/" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h1 className="sr-only">tacta</h1>
        <Image
          src="/logo.png"
          alt=""
          width={1254}
          height={1254}
          priority
          className="h-8 w-auto dark:invert"
        />
      </Link>
    </header>
  );
}
