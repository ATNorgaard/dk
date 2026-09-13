import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  weight: "400",
  style: ["italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TrustUsConsult",
    template: "%s · TrustUsConsult",
  },
  description:
    "Femten fag bag femten vinduer. Selvstændige specialister i ét hus — mød specialisten direkte.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="da"
      className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
