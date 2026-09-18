import type { Lang } from "@/lib/i18n";

/**
 * Privacy notice and client terms. DRAFTS, written 18 September 2026 for the
 * legal domain to review before launch; the pages say so at the top. Kim
 * decides the open points marked [ ]: address and CVR, contract party,
 * payment terms. Danish is the governing text; English is a translation.
 */
export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalDoc = { title: string; updated: string; draftNotice: string; intro: string; sections: LegalSection[] };

const updated: Record<Lang, string> = { da: "Opdateret 18. september 2026", en: "Updated 18 September 2026" };
const draftNotice: Record<Lang, string> = {
  da: "Udkast. Teksten er skrevet af huset og afventer gennemsyn af det juridiske domæne, før den er endelig.",
  en: "Draft. Written by the house and awaiting review by the legal domain before it is final.",
};

export const privacy: Record<Lang, LegalDoc> = {
  da: {
    title: "Privatliv",
    updated: updated.da,
    draftNotice: draftNotice.da,
    intro: "Sådan behandler TrustUsConsult personoplysninger på www.trustusconsult.dk: hvad vi gemmer, hvorfor, hvor længe, og hvilke rettigheder du har.",
    sections: [
      {
        heading: "Dataansvarlig",
        paragraphs: [
          "TrustUsConsult, [adresse], CVR [nummer], er dataansvarlig for behandlingen beskrevet her. Spørgsmål om dine oplysninger sendes til kontakt@trustusconsult.dk.",
        ],
      },
      {
        heading: "Besøg på sitet",
        paragraphs: [
          "Vi bruger ingen sporingscookies og ingen tredjeparts annoncering. Besøgsstatistik føres af huset selv: hver dag beregnes et tilfældigt, saltet fingeraftryk af din forbindelse, som slettes næste dag. Det kan tælle besøgende pr. dag og intet andet.",
          "Den eneste cookie, sitet sætter, er din login-session, og kun når du logger ind. Derfor er der ingen cookiebanner.",
        ],
      },
      {
        heading: "Når du skriver til os",
        paragraphs: [
          "Kontaktformularen, ansøgningen om optagelse og anmodningen om adgang til fulde CV'er gemmer navn, e-mail, eventuel virksomhed og din besked. Vi bruger oplysningerne til at svare dig og til at behandle din ansøgning eller anmodning. Grundlaget er databeskyttelsesforordningens artikel 6, stk. 1, litra b (skridt før en aftale) og litra f (vores legitime interesse i at besvare henvendelser).",
          "For at holde formularerne fri for misbrug gemmer vi i op til to dage et saltet fingeraftryk af din IP-adresse og din e-mail, som ikke kan føres tilbage til dig.",
        ],
      },
      {
        heading: "Mødeforespørgsler",
        paragraphs: [
          "Når du beder om et møde med en specialist, gemmer vi navn, e-mail, eventuel virksomhed, dine foreslåede tider og din beskrivelse af opgaven. Specialisten ser oplysningerne for at svare; bestyrelsen ser dem for at følge svartider. Du kan følge og annullere forespørgslen via linket i din mail.",
        ],
      },
      {
        heading: "Kunder med adgang",
        paragraphs: [
          "Godkendte kunder logger ind med et link sendt til deres e-mail; der er ingen adgangskode. Vi gemmer e-mail, navn, virksomhed og tidspunktet for dit login. Vi registrerer ikke, hvilke profiler du åbner.",
        ],
      },
      {
        heading: "Specialister i huset",
        paragraphs: [
          "Specialister vedligeholder selv deres profil: titel, beskrivelse, kompetencer, erfaring, uddannelse, certificeringer, portræt, ledighed og takst. Profilen offentliggøres først, når specialisten selv udgiver den, og pladsen er aktiv. Takst og kontaktoplysninger vises kun for godkendte kunder. Oplysningerne behandles som led i medlemsaftalen.",
        ],
      },
      {
        heading: "Databehandlere",
        paragraphs: ["Vi bruger tre leverandører, som behandler oplysninger på vores vegne under databehandleraftaler:"],
        items: [
          "Supabase (database, login og filer), datacenter i Frankfurt, EU.",
          "Vercel (drift af hjemmesiden), EU-region.",
          "Resend (afsendelse af e-mails), EU-region.",
        ],
      },
      {
        heading: "Hvor længe",
        items: [
          "Henvendelser via kontaktformularen: 12 måneder.",
          "Ansøgninger om optagelse: så længe de behandles; afviste slettes efter 6 måneder.",
          "Anmodninger om adgang: 90 dage efter afgørelse.",
          "Mødeforespørgsler: 12 måneder efter det aftalte eller sidste foreslåede tidspunkt.",
          "Specialistprofiler: så længe medlemskabet varer, plus 30 dage.",
          "Kundekonti: så længe adgangen er aktiv; slettes 12 måneder efter sidste login.",
        ],
      },
      {
        heading: "Dine rettigheder",
        paragraphs: [
          "Du kan bede om indsigt i, rettelse af eller sletning af dine oplysninger, og du kan gøre indsigelse mod behandlingen. Skriv til kontakt@trustusconsult.dk. Du kan klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby, datatilsynet.dk.",
        ],
      },
      {
        heading: "Ændringer",
        paragraphs: ["Ændrer vi denne tekst, opdateres datoen øverst. Væsentlige ændringer får specialister og kunder besked om på e-mail."],
      },
    ],
  },
  en: {
    title: "Privacy",
    updated: updated.en,
    draftNotice: draftNotice.en,
    intro: "How TrustUsConsult handles personal data on www.trustusconsult.dk: what we keep, why, for how long, and what your rights are. The Danish text governs.",
    sections: [
      {
        heading: "Controller",
        paragraphs: ["TrustUsConsult, [address], CVR [number], is the controller for the processing described here. Questions about your data go to kontakt@trustusconsult.dk."],
      },
      {
        heading: "Visiting the site",
        paragraphs: [
          "We use no tracking cookies and no third-party advertising. Visit statistics are kept by the house itself: each day a random, salted fingerprint of your connection is computed and discarded the next day. It can count visitors per day and nothing else.",
          "The only cookie the site sets is your login session, and only when you sign in. That is why there is no cookie banner.",
        ],
      },
      {
        heading: "When you write to us",
        paragraphs: [
          "The contact form, the application for admission and the request for access to full CVs store name, email, company if given, and your message. We use them to answer you and to handle your application or request. The legal basis is GDPR article 6(1)(b) (steps prior to a contract) and 6(1)(f) (our legitimate interest in answering enquiries).",
          "To keep the forms free of abuse we keep, for up to two days, a salted fingerprint of your IP address and your email that cannot be traced back to you.",
        ],
      },
      {
        heading: "Meeting requests",
        paragraphs: [
          "When you ask for a meeting with a specialist we store name, email, company if given, your proposed times and your description of the brief. The specialist sees them to reply; the board sees them to follow response times. You can follow and cancel the request through the link in your mail.",
        ],
      },
      {
        heading: "Clients with access",
        paragraphs: ["Approved clients sign in with a link sent to their email; there is no password. We store email, name, company and the time of your sign-in. We do not record which profiles you open."],
      },
      {
        heading: "Specialists in the house",
        paragraphs: [
          "Specialists maintain their own profile: title, description, skills, experience, education, certifications, portrait, availability and rate. A profile is public only once the specialist publishes it and the seat is active. Rate and contact details are shown to approved clients only. The data is processed under the membership agreement.",
        ],
      },
      {
        heading: "Processors",
        paragraphs: ["We use three providers that process data on our behalf under data processing agreements:"],
        items: ["Supabase (database, sign-in and files), data centre in Frankfurt, EU.", "Vercel (hosting of the site), EU region.", "Resend (sending of emails), EU region."],
      },
      {
        heading: "For how long",
        items: [
          "Contact form enquiries: 12 months.",
          "Applications for admission: while under consideration; declined ones are deleted after 6 months.",
          "Access requests: 90 days after the decision.",
          "Meeting requests: 12 months after the agreed or last proposed time.",
          "Specialist profiles: for the duration of membership, plus 30 days.",
          "Client accounts: while access is active; deleted 12 months after the last sign-in.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You may ask for access to, correction of or deletion of your data, and you may object to the processing. Write to kontakt@trustusconsult.dk. You may complain to the Danish Data Protection Agency (Datatilsynet), Carl Jacobsens Vej 35, 2500 Valby, datatilsynet.dk.",
        ],
      },
      { heading: "Changes", paragraphs: ["If this text changes, the date at the top is updated. Specialists and clients are told about material changes by email."] },
    ],
  },
};

export const terms: Record<Lang, LegalDoc> = {
  da: {
    title: "Vilkår",
    updated: updated.da,
    draftNotice: draftNotice.da,
    intro: "Vilkår for kunder, der bruger www.trustusconsult.dk til at finde og møde en specialist. Selve opgaven aftales altid i en særskilt aftale.",
    sections: [
      {
        heading: "Hvem vi er",
        paragraphs: ["TrustUsConsult, [adresse], CVR [nummer], er et kollektiv af selvstændige specialister organiseret i femten domæner. Sitet viser specialisternes profiler og formidler den første kontakt."],
      },
      {
        heading: "Mødeforespørgsler",
        paragraphs: [
          "En mødeforespørgsel er en forespørgsel, ikke en bestilling. Specialisten svarer inden for rimelig tid ved at acceptere en af dine tider, foreslå en anden eller afslå. Det første møde på tyve eller femogfyrre minutter er uden beregning og uden forpligtelse for nogen af parterne.",
        ],
      },
      {
        heading: "Aftale om en opgave",
        paragraphs: [
          "Enhver opgave aftales skriftligt, før arbejdet begynder, i husets standardaftale eller i en aftale, parterne selv udformer. Aftalen fastlægger omfang, pris, tidsplan, fortrolighed og ansvar. Intet på sitet er et tilbud i aftalelovens forstand.",
          "[ ] Aftalepart: opgaven aftales med [TrustUsConsult som kollektiv / den enkelte specialist]. Afventer beslutning.",
        ],
      },
      {
        heading: "Priser og betaling",
        paragraphs: [
          "Takster på sitet er vejledende timepriser ekskl. moms og kan ændres indtil en aftale er indgået. [ ] Fakturering: [én samlet faktura pr. måned fra TrustUsConsult / faktura fra den enkelte specialist], betalingsfrist [30] dage netto. Afventer beslutning.",
        ],
      },
      {
        heading: "Adgang til fulde CV'er",
        paragraphs: [
          "Fulde CV'er, takster og kontaktoplysninger vises kun for kunder, som huset har godkendt. Adgangen er personlig, må ikke deles, og må kun bruges til at vurdere et samarbejde. Huset kan lukke adgangen uden varsel ved misbrug.",
        ],
      },
      {
        heading: "Fortrolighed",
        paragraphs: ["Det, du skriver i en henvendelse eller en mødeforespørgsel, behandles fortroligt af huset og af den specialist, det angår. Fortrolighed om selve opgaven aftales i opgaveaftalen."],
      },
      {
        heading: "Ansvar",
        paragraphs: [
          "Sitet stilles til rådighed, som det er. Huset indestår ikke for, at en specialist er ledig på et bestemt tidspunkt, eller for indholdet af profiler, som specialisterne selv vedligeholder. Ansvar for udført arbejde reguleres af opgaveaftalen.",
        ],
      },
      {
        heading: "Ændringer og lovvalg",
        paragraphs: ["Vilkårene kan ændres; den gældende version findes altid på denne side med dato. Dansk ret gælder, og tvister afgøres ved danske domstole."],
      },
    ],
  },
  en: {
    title: "Terms",
    updated: updated.en,
    draftNotice: draftNotice.en,
    intro: "Terms for clients using www.trustusconsult.dk to find and meet a specialist. The engagement itself is always agreed separately. The Danish text governs.",
    sections: [
      { heading: "Who we are", paragraphs: ["TrustUsConsult, [address], CVR [number], is a collective of independent specialists organised in fifteen domains. The site presents the specialists' profiles and arranges the first contact."] },
      {
        heading: "Meeting requests",
        paragraphs: [
          "A meeting request is a request, not an order. The specialist replies within reasonable time by accepting one of your times, proposing another or declining. The first meeting of twenty or forty-five minutes is free of charge and without obligation for either party.",
        ],
      },
      {
        heading: "Agreeing an engagement",
        paragraphs: [
          "Every engagement is agreed in writing before work starts, in the house's standard agreement or one the parties draft themselves. It sets scope, price, schedule, confidentiality and liability. Nothing on the site is an offer in the legal sense.",
          "[ ] Contracting party: the engagement is agreed with [TrustUsConsult as a collective / the individual specialist]. Decision pending.",
        ],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          "Rates on the site are indicative hourly rates excluding VAT and may change until an agreement is made. [ ] Invoicing: [one consolidated invoice per month from TrustUsConsult / an invoice from the individual specialist], payment [30] days net. Decision pending.",
        ],
      },
      {
        heading: "Access to full CVs",
        paragraphs: ["Full CVs, rates and contact details are shown only to clients the house has approved. Access is personal, may not be shared, and may only be used to assess a collaboration. The house may close access without notice on misuse."],
      },
      { heading: "Confidentiality", paragraphs: ["What you write in an enquiry or a meeting request is treated in confidence by the house and by the specialist concerned. Confidentiality about the engagement itself is agreed in the engagement agreement."] },
      {
        heading: "Liability",
        paragraphs: [
          "The site is provided as is. The house does not warrant that a specialist is available at a given time, nor the content of profiles the specialists maintain themselves. Liability for work performed is governed by the engagement agreement.",
        ],
      },
      { heading: "Changes and governing law", paragraphs: ["The terms may change; the current version is always on this page with its date. Danish law applies and disputes are settled by the Danish courts."] },
    ],
  },
};
