import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang } from "@/lib/i18n";
import { terms } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/vilkaar">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "en" ? "Terms" : "Vilkår" };
}

export default async function TermsPage({ params }: PageProps<"/[lang]/vilkaar">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalPage lang={lang} pathname={href(lang, "/vilkaar")} doc={terms[lang]} />;
}
