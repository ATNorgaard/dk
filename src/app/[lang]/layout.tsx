import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { LANGS, htmlLang, isLang } from "@/lib/i18n";
import "../globals.css";

const serif = Instrument_Serif({
  weight: "400",
  style: ["italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const da = lang === "da";
  return {
    title: { default: "TrustUsConsult", template: "%s · TrustUsConsult" },
    description: da
      ? "Femten fag bag femten vinduer. Selvstændige specialister i ét hus — mød specialisten direkte."
      : "Fifteen crafts behind fifteen windows. Independent specialists in one house — meet the specialist directly.",
    alternates: {
      languages: { da: "/da", en: "/en", "x-default": "/da" },
    },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={htmlLang[lang]} className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
