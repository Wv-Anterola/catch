import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "CATCH: Care-gap Alerts for Treating Community Hypertension",
  description:
    "An auditable, deterministic workflow that surfaces potential hypertension care gaps in SyntheticRI for human follow-up.",
  // CATCH ships its own calm light theme; tell dark-mode extensions to leave it alone
  // so the demo renders identically on any machine.
  other: { "darkreader-lock": "true", "color-scheme": "light" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
