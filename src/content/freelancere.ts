import type { I18nText } from "@/lib/i18n";
import type { Titled } from "./landing";

/** Copy for the freelancer page, ported from the Claude Design "Freelancere" screen. */
export const freelancere = {
  hero: {
    eyebrow: { da: "For selvstændige specialister", en: "For independent specialists" },
    title: { da: "Selvstændig. Men ikke {em}alene{/em}.", en: "Independent. But not {em}alone{/em}." },
    lede: {
      da: "Du beholder dine kunder, din takst og din kalender. Du køber dig ind i et domæne — og slipper for selv at bygge fakturering, booking, kontrakter og synlighed.",
      en: "You keep your clients, your rate and your calendar. You buy into a domain — and stop building invoicing, booking, contracts and visibility on your own.",
    },
    primary: { da: "Søg optagelse i et domæne", en: "Apply to a domain" },
    secondary: { da: "Se kollektivet som kunderne ser det", en: "See what clients see" },
  },
  band: {
    da: ["Egen takst", "Egne kunder", "Fælles maskine", "Femten domæner", "Én faktura"],
    en: ["Your rate", "Your clients", "Shared machinery", "Fifteen domains", "One invoice"],
  },
  sections: {
    gets: { number: "01", label: { da: "Hvad du får", en: "What you get" } },
    economics: { number: "02", label: { da: "Økonomi", en: "Economics" } },
    admission: { number: "03", label: { da: "Optagelse", en: "Admission" } },
    open: { number: "04", label: { da: "Åbne pladser", en: "Open seats" } },
  },
  gets: {
    title: { da: "Den maskine, du aldrig {em}fik bygget{/em}.", en: "The machinery you never {em}got around to{/em}." },
    intro: {
      da: "De fleste freelancere bruger en dag om ugen på noget, ingen betaler dem for. Det er den dag, kollektivet køber tilbage.",
      en: "Most freelancers spend a day a week on work nobody pays for. That is the day the collective buys back.",
    },
    items: [
      { number: "01", title: { da: "En plads på kortet", en: "A place on the map" }, text: { da: "Din profil ligger i domænet, hvor kunderne leder — med takst, kapacitet og cases. Ikke bagerst i et katalog.", en: "Your profile sits in the domain where clients are already looking — with rate, capacity and cases. Not at the back of a directory." } },
      { number: "02", title: { da: "Fakturering og opkrævning", en: "Invoicing and collection" }, text: { da: "Kollektivet fakturerer, rykker og følger op. Du sender timer ind; pengene kommer ind på en fast dato.", en: "The collective invoices, chases and follows up. You submit hours; the money lands on a fixed date." } },
      { number: "03", title: { da: "Booking i din egen kalender", en: "Booking in your own calendar" }, text: { da: "Kunder booker de tider, du selv har åbnet. Ingen mailtråde om hvornår du kan.", en: "Clients book the slots you opened yourself. No mail threads about when you are free." } },
      { number: "04", title: { da: "Kontrakter og jura", en: "Contracts and legal" }, text: { da: "Standardaftale, databehandleraftale og ansvarsforsikring gennem kollektivet. Gennemgået af domænet for jura.", en: "Standard agreement, data processing agreement and liability cover through the collective. Reviewed by the legal domain." } },
      { number: "05", title: { da: "Kolleger, når opgaven kræver det", en: "Colleagues when the brief needs them" }, text: { da: "Fjorten andre domæner at trække på — og en fordelingsnøgle, der er aftalt på forhånd.", en: "Fourteen other domains to draw on — and a split agreed in advance." } },
    ] as Titled[],
    facts: [
      { label: { da: "Indskud", en: "Buy-in" }, value: { da: "12.000 kr. én gang", en: "DKK 12,000 once" }, detail: { da: "Betales ved optagelse i domænet", en: "Paid on admission to the domain" } },
      { label: { da: "Andel", en: "Share" }, value: { da: "6 % af formidlet arbejde", en: "6 % of brokered work" }, detail: { da: "Dine egne kunder er undtaget", en: "Your own clients are exempt" } },
      { label: { da: "Opsigelse", en: "Notice" }, value: { da: "En måned, ingen binding", en: "One month, no lock-in" }, detail: { da: "Du beholder profil, cases og kunder", en: "You keep your profile, cases and clients" } },
    ] as { label: I18nText; value: I18nText; detail: I18nText }[],
  },
  economics: {
    title: { da: "Prisen står {em}på bordet{/em}.", en: "The price is {em}on the table{/em}." },
    intro: { da: "Ingen provisionstrappe, ingen fælles pulje, ingen forhandling om hvad din tid er værd.", en: "No commission ladder, no shared pool, no negotiation about what your time is worth." },
    buyIn: { label: { da: "Indskud", en: "Buy-in" }, value: { da: "12.000 kr. ved optagelse", en: "DKK 12,000 on admission" }, text: { da: "Én gang. Det finansierer din plads i domænet, din profil og din del af den fælles maskine.", en: "Once. It funds your place in the domain, your profile and your share of the shared machinery." } },
    share: { label: { da: "Løbende", en: "Ongoing" }, value: { da: "6 % af omsætning gennem kollektivet", en: "6 % of revenue booked through the collective" }, text: { da: "Kun på det arbejde, kollektivet skaffer. Dine egne kunder er dine egne — vi tager ikke en andel af dem.", en: "Only on work the collective brings you. Your own clients stay your own — we take no share of them." } },
  },
  admission: {
    title: { da: "Optagelse tager {em}tre uger{/em}.", en: "Admission takes {em}three weeks{/em}." },
    intro: { da: "Domænet afgør selv, hvem der kommer ind. Kravet er otte år i faget og en reference, vi kan ringe til.", en: "The domain decides who joins. The bar is eight years in the craft and a reference we can call." },
    steps: [
      { period: { da: "Uge 1", en: "Week 1" }, title: { da: "Ansøgning", en: "Application" }, role: { da: "Dig og domænet", en: "You and the domain" }, text: { da: "Du sender CV, to cases og hvilket domæne du søger. Vi svarer inden for fem hverdage.", en: "You send a CV, two cases and the domain you are applying to. We answer within five working days." } },
      { period: { da: "Uge 2", en: "Week 2" }, title: { da: "Faglig samtale", en: "Craft interview" }, role: { da: "To specialister fra domænet", en: "Two specialists from the domain" }, text: { da: "En time om dit fag, ikke om din motivation. Domænet skal kunne stå bag dit arbejde over for kunder.", en: "An hour about your craft, not your motivation. The domain has to be able to stand behind your work." } },
      { period: { da: "Uge 3", en: "Week 3" }, title: { da: "Optagelse", en: "Admission" }, role: { da: "Kollektivet", en: "The collective" }, text: { da: "Indskud, aftale og profil. Du er på kortet, dagen efter din profil er godkendt.", en: "Buy-in, agreement and profile. You are on the map the day after your profile is approved." } },
    ] as { period: I18nText; title: I18nText; role: I18nText; text: I18nText }[],
    calloutLabel: { da: "Optagelseskravet", en: "The bar" },
    calloutText: { da: "Otte år i faget. En reference, vi kan ringe til.", en: "Eight years in the craft. A reference we can call." },
  },
  open: {
    title: { da: "{n} domæner {em}mangler{/em} folk lige nu.", en: "{n} domains are {em}short{/em} right now." },
    intro: { da: "Efterspørgslen ligger foran bemandingen her. Ansøger du til et af dem, ryger du forrest i køen.", en: "Demand runs ahead of staffing in these. Apply to one of them and you go to the front of the queue." },
    seatLine: { da: "{n} ledige pladser", en: "{n} open seats" },
  },
  contact: {
    eyebrow: { da: "Domænet svarer selv — inden for fem hverdage", en: "The domain answers itself — within five working days" },
    title: { da: "Skal din plads stå {em}på kortet?{/em}", en: "Should your seat be {em}on the map?{/em}" },
    intro: { da: "Send CV, to cases og det domæne, du søger. Er du i tvivl om domænet, skriver du bare faget.", en: "Send a CV, two cases and the domain you are applying to. If you are unsure which domain, just name the craft." },
    frontPage: { da: "Forsiden ↗", en: "Front page ↗" },
  },
};
