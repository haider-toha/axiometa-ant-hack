import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speech to Braille — Communication Aid",
  description:
    "An accessible speech-to-braille communication aid for deafblind and low-vision users. It captures spoken words, shows a large live caption, and buzzes a condensed keyword to a wrist-worn braille display — with spoken reply suggestions.",
  applicationName: "Speech to Braille",
};

export const viewport: Viewport = {
  themeColor: "#111111",
  colorScheme: "dark",
  // width=device-width, initial-scale=1 is Next's default; user zoom is left
  // enabled on purpose (do not disable — required for Reflow / Zoom, 1.4.10).
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
