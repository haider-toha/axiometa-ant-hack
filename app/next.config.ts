import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The scrollytelling deck in public/deck is the public landing, served at "/"
  // via a rewrite (URL stays "/"). The demo tools live at /capture and /output.
  // The deck's <base href="/deck/"> resolves its relative assets.
  async rewrites() {
    return [{ source: "/", destination: "/deck/index.html" }];
  },
};

export default nextConfig;
