import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang } from "@/lib/i18n";
import { privacy } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/privatliv">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "en" ? "Privacy" : "Privatliv" };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privatliv">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalPage lang={lang} pathname={href(lang, "/privatliv")} doc={privacy[lang]} />;
}
