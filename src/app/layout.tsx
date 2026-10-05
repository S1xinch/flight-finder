import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { userId } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Flight Finder: compare flight prices", template: "%s | Flight Finder" },
  description: "Search live flight prices, spot deals against 30-day price history, and get an email when a fare drops. Free, no affiliate links.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uid = await userId();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <header className="wrap flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold no-underline">Flight Finder</Link>
          <nav aria-label="Account" className="flex gap-4">
            {uid ? (
              <Link href="/dashboard" className="underline">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="underline">Sign in</Link>
                <Link href="/register" className="underline">Create account</Link>
              </>
            )}
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="wrap mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <a href="https://github.com/S1xinch/flight-finder">Source code</a>
        </footer>
      </body>
    </html>
  );
}
