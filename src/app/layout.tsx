import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BackButton, PwaInit, TabBar } from "@/components/Pwa";
import { userId } from "@/lib/auth";
import { BRAND, SPLASH, splashMedia } from "@/lib/pwa";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Flight Finder: compare flight prices", template: "%s | Flight Finder" },
  description: "Search live flight prices, spot deals against 30-day price history, and get an email when a fare drops. Free, no affiliate links.",
  applicationName: "Flight Finder",
  formatDetection: { telephone: false },
  icons: { apple: [{ url: "/pwa/icon/180", sizes: "180x180", type: "image/png" }] },
  // Next only emits the newer mobile-web-app-capable; iOS Safari still keys off the Apple-prefixed tag.
  other: { "apple-mobile-web-app-capable": "yes" },
  appleWebApp: {
    capable: true,
    title: "Flights", // home-screen label: keep it short
    statusBarStyle: "black-translucent",
    startupImage: SPLASH.map((s) => ({ url: `/pwa/splash/${s[0]}x${s[1]}`, media: splashMedia(s) })),
  },
};
// viewport-fit=cover lets the header paint under the status bar; safe-area insets keep content clear of notch and home indicator.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: BRAND };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const uid = await userId();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Startup splash: once per launch of the installed app. Runs before first paint so the splash covers the page;
            add ?splash=1 to any URL to preview it in a browser. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(/[?&]splash=1/.test(location.search)){d.dataset.splashForce="1"}else if(sessionStorage.getItem("ff_splash")){d.dataset.splash="done"}else{sessionStorage.setItem("ff_splash","1")}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div id="splash" className="splash" aria-hidden="true">
          <svg className="splash-plane" viewBox="0 0 32 32">
            <path d="M5 18l22-9-7 16-4-6-5 4z" fill="#fff" />
          </svg>
          <div className="splash-title">Flight Finder</div>
        </div>
        <PwaInit />
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <header className="chrome">
          <div className="wrap flex items-center justify-between gap-4" style={{ paddingTop: 8, paddingBottom: 8, minHeight: 56 }}>
            <div className="flex items-center gap-1">
              <BackButton />
              <Link href="/" className="brand">Flight Finder</Link>
            </div>
            <nav aria-label="Account" className="topnav flex gap-4">
              {uid ? (
                <Link href="/dashboard" className="underline">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="underline">Sign in</Link>
                  <Link href="/register" className="underline">Create account</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="wrap mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <a href="https://github.com/S1xinch/flight-finder">Source code</a>
        </footer>
        <TabBar signedIn={!!uid} />
      </body>
    </html>
  );
}
