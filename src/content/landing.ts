import type { I18nText } from "@/lib/i18n";

/**
 * Landing page copy, ported from the Claude Design "Landing v2" screen.
 * Titles use {em} to mark the italic highlight. Figures that the prototype
 * invented (response time, specialist count) are not repeated here; the
 * numbers on the page come from the database.
 */
export type Titled = { title: I18nText; text: I18nText; number?: string; tag?: I18nText };

export const landing = {
  hero: {
    eyebrow: { da: "Find dine folk", en: "Find your people" },
    title: { da: "Gode naboer.{em}Stort arbejde.", en: "Good neighbours.{em}Great work." },
    lede: {
      da: "Femten fag bag femten vinduer. Kig ind i ét — og mød den, der sidder der.",
      en: "Fifteen crafts behind fifteen windows. Look into one — and meet whoever is sitting there.",
    },
    explore: { da: "Zoom ind på et vindue", en: "Zoom in on a window" },
    points: [
      { da: "Mød specialisten direkte.", en: "Meet the specialist directly." },
      { da: "Hent naboerne ind, når opgaven kræver det.", en: "Bring the neighbours in when the job calls for it." },
      { da: "Én aftale. Én fælles adresse.", en: "One agreement. One shared address." },
    ] as I18nText[],
    house: { da: "Huset", en: "The house" },
    window: { da: "Vindue", en: "Window" },
    inside: { da: "Indenfor", en: "Inside" },
    enter: { da: "Kig indenfor", en: "Step inside" },
    hoverHint: { da: "Eller klik på vinduet. Hold musen over et andet for at skifte.", en: "Or click the window. Hover another to switch." },
    lightsWith: { da: "Vinduer, der lyser med", en: "Windows that light up with it" },
    backToWindow: { da: "← Ud til vinduet", en: "← Back out to the window" },
    prev: { da: "Forrige domæne", en: "Previous domain" },
    next: { da: "Næste domæne", en: "Next domain" },
    tourIdle: { da: "15 vinduer · hold musen over ét", en: "15 windows · hover one" },
    tourOf: { da: "Vindue {n} af 15", en: "Window {n} of 15" },
    yourSpecialist: { da: "Din specialist", en: "Your specialist" },
    recruitingTitle: { da: "Vinduet er ledigt.", en: "The window is open." },
    recruitingText: {
      da: "Domænet søger sin første specialist. Er du kunde, skriver du til os, og vi finder faget udenfor huset, indtil pladsen er besat. Er du selv specialisten, står døren åben.",
      en: "This domain is looking for its first specialist. If you are a client, write to us and we will find the craft outside the house until the seat is taken. If you are the specialist, the door is open.",
    },
    seatsLine: { da: "{active} af {total} pladser besat", en: "{active} of {total} seats taken" },
    contactUs: { da: "Skriv til os", en: "Write to us" },
    applyHere: { da: "Søg pladsen", en: "Apply for the seat" },
    openDomainPage: { da: "Åbn domænesiden", en: "Open the domain page" },
  },
  sections: {
    collective: { number: "01", label: { da: "Kollektivet", en: "Collective" } },
    how: { number: "02", label: { da: "Sådan", en: "Process" } },
    tools: { number: "03", label: { da: "Værktøjer", en: "Utilities" } },
    faq: { number: "04", label: { da: "Spørgsmål", en: "Questions" } },
  },
  collective: {
    title: { da: "Femten fag. Én {em}ramme{/em}.", en: "Fifteen crafts. One {em}frame{/em}." },
    intro: {
      da: "Specialister, der arbejder for sig selv, men ikke alene. Huset ovenfor er ikke en illustration — det er den måde, kollektivet faktisk er skruet sammen.",
      en: "Specialists who work for themselves, but not alone. The house above is not an illustration — it is how the collective is actually put together.",
    },
    p1: {
      da: "TrustUsConsult er ikke et konsulenthus. Det er femten domæner, hvor selvstændige specialister har købt sig ind — hver med sit eget fag, sin egen kalender og sin egen takst. Du møder specialisten direkte, ikke en salgsafdeling.",
      en: "TrustUsConsult is not a consultancy. It is fifteen domains where independent specialists have bought in — each with their own craft, calendar and rate. You meet the specialist directly, not a sales department.",
    },
    p2: {
      da: "Det fælles er rammen: én kontrakt, én faktura, ét kontaktpunkt — og et krav om, at alle i kollektivet har leveret i deres fag i mindst otte år. Har en opgave brug for to domæner, sætter vi holdet uden at du skal forhandle to gange.",
      en: "What we share is the frame: one contract, one invoice, one point of contact — and a requirement that everyone in the collective has at least eight years in their craft. If a brief needs two domains, we assemble the team without you negotiating twice.",
    },
    facts: {
      domains: { label: { da: "Kollektivet", en: "The collective" }, detail: { da: "Aalborg · Aarhus · København", en: "Aalborg · Aarhus · Copenhagen" } },
      recruiting: { label: { da: "Åbne pladser", en: "Open seats" }, detail: { da: "Domæner, der søger specialister lige nu", en: "Domains recruiting right now" } },
      bar: { label: { da: "Erfaringskrav", en: "Experience bar" }, value: { da: "Minimum 8 år i faget", en: "Minimum 8 years in the craft" }, detail: { da: "Alle optages efter samtale med domænet", en: "Everyone is admitted after an interview with the domain" } },
    },
  },
  how: {
    title: { da: "Fra behov til {em}specialist{/em} i tre skridt.", en: "From need to {em}specialist{/em} in three steps." },
    intro: {
      da: "Ingen indledende afdækningsfase, intet salgsmøde med en, der ikke selv skal lave arbejdet.",
      en: "No preliminary discovery phase, no sales meeting with someone who will not be doing the work.",
    },
    steps: [
      { number: "01", title: { da: "Find domænet", en: "Find the domain" }, text: { da: "Klik dig ind i huset. Hvert domæne viser sine specialister, og hvornår de kan starte — før du kontakter nogen.", en: "Click into the house. Every domain shows its specialists and when they can start — before you contact anyone." } },
      { number: "02", title: { da: "Book et møde", en: "Book a meeting" }, text: { da: "Tyve minutter i specialistens egen kalender. Passer det ikke, foreslår domænet en anden, der kan.", en: "Twenty minutes in the specialist's own calendar. If the fit is wrong, the domain suggests someone who fits." } },
      { number: "03", title: { da: "Arbejd sammen", en: "Get to work" }, text: { da: "Én aftale, én faktura, én kontaktperson — også når opgaven trækker på to eller tre domæner.", en: "One agreement, one invoice, one contact — even when the brief pulls in two or three domains." } },
    ] as Titled[],
  },
  tools: {
    title: { da: "Det administrative ligger {em}udenfor{/em} fakturaen.", en: "The admin sits {em}outside{/em} your invoice." },
    intro: {
      da: "Kollektivet driver den maskine, en enkelt freelancer sjældent får bygget. Du oplever den som forudsigelighed.",
      en: "The collective runs the machinery a lone freelancer rarely gets built. You experience it as predictability.",
    },
    items: [
      { number: "01", title: { da: "Fakturering", en: "Invoicing" }, text: { da: "Én samlet faktura pr. måned, uanset hvor mange specialister der har været på opgaven.", en: "One consolidated invoice per month, however many specialists worked the brief." } },
      { number: "02", title: { da: "Booking", en: "Booking" }, text: { da: "Fælles kalender på tværs af domænerne, så du ser reel kapacitet — ikke et løfte om at vende tilbage.", en: "A shared calendar across the domains, so you see real capacity — not a promise to get back to you." } },
      { number: "03", title: { da: "Kontrakter", en: "Contracts" }, text: { da: "Standardaftale gennemgået af domænet for jura. Databehandleraftale ligger klar, når opgaven kræver det.", en: "A standard agreement reviewed by the legal domain. A data processing agreement is ready when the brief needs one." } },
      { number: "04", title: { da: "Marketing", en: "Marketing" }, text: { da: "Specialisterne deler profil, cases og synlighed — derfor bruger de deres tid på dit arbejde frem for på deres eget.", en: "Specialists share profile, cases and visibility — which is why they spend their time on your work rather than their own." } },
    ] as Titled[],
    calloutLabel: { da: "Kollektivets princip", en: "Our principle" },
    calloutText: { da: "Du hyrer et fag, ikke et firma.", en: "You hire a craft, not a company." },
  },
  faq: {
    title: { da: "Det, folk {em}spørger{/em} om først.", en: "What people {em}ask{/em} first." },
    intro: { da: "Fire spørgsmål, vi får i næsten hvert første møde.", en: "Four questions we get in almost every first meeting." },
    items: [
      { q: { da: "Hvad koster det?", en: "What does it cost?" }, a: { da: "Specialistens egen timetakst. Kollektivet lægger intet gebyr oveni for dig som kunde; rammen finansieres af specialisternes indskud.", en: "The specialist's own hourly rate. The collective adds no fee on top for you as a client; the frame is funded by the specialists' buy-in." } },
      { q: { da: "Hvem har jeg kontrakt med?", en: "Who is my contract with?" }, a: { da: "Med kollektivet. Det gælder også, når opgaven løses af specialister fra flere domæner — én aftale, én faktura, ét sted at gå hen, hvis noget skal justeres.", en: "With the collective. That holds even when several domains work the brief — one agreement, one invoice, one place to go if something needs adjusting." } },
      { q: { da: "Hvor hurtigt kan I starte?", en: "How fast can you start?" }, a: { da: "Første møde inden for en uge. Huset viser, hvilke domæner der har kapacitet, før du spørger.", en: "A first meeting within a week. The house shows which domains have capacity before you ask." } },
      { q: { da: "Hvad hvis kemien ikke er der?", en: "What if the fit isn't right?" }, a: { da: "Sig det efter første leverance. Vi finder en anden specialist i domænet, og du betaler kun for det arbejde, der er udført.", en: "Say so after the first delivery. We find another specialist in the domain, and you pay only for the work done." } },
    ] as { q: I18nText; a: I18nText }[],
  },
  contact: {
    eyebrow: { da: "Tyve minutter er nok til at finde ud af det", en: "Twenty minutes is enough to find out" },
    title: { da: "Skal vi finde den rigtige {em}specialist?{/em}", en: "Shall we find you the right {em}specialist?{/em}" },
    intro: {
      da: "Skriv hvad opgaven handler om — så finder vi domænet. Er du selv specialist, ligger der en anden dør.",
      en: "Tell us what the brief is about and we will find the domain. If you are a specialist yourself, there is another door.",
    },
    joinLink: { da: "Bliv en del af kollektivet ↗", en: "Join the collective ↗" },
  },
};
