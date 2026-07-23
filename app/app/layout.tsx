import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

// CATCH reads like a clinical instrument, so it is set in the IBM Plex superfamily:
// Plex Sans for humanist-but-precise UI text, and Plex Mono for the data readouts,
// counts, and labels that should look like a monitor's printout. One family, two
// voices, self-hosted at build time (works with the static export).
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CATCH: Care-gap Alerts for Treating Community Hypertension",
  description:
    "An auditable, deterministic workflow that surfaces potential hypertension care gaps in SyntheticRI for human follow-up.",
  // CATCH ships its own calm light theme; tell dark-mode extensions to leave it alone
  // so the demo renders identically on any machine.
  other: { "darkreader-lock": "true", "color-scheme": "light" },
};

// Scale to the device on phones and tablets; keep pinch-zoom enabled for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full antialiased ${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Marks JS-capable before paint so scroll-reveal can hide its initial state
            without ever hiding content from no-JS visitors. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <SiteHeader />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
