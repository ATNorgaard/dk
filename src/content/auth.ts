import type { I18nText } from "@/lib/i18n";
import type { Role } from "@/lib/auth";

/** Interface copy for sign-in, the portal shell and the admin shell. */
export const auth = {
  login: {
    eyebrow: { da: "Log ind", en: "Sign in" } as I18nText,
    title: { da: "Ind i {em}huset{/em}", en: "Into the {em}house{/em}" } as I18nText,
    intro: {
      da: "Skriv din e-mail, så sender vi et link. Ingen adgangskode at huske.",
      en: "Enter your email and we send you a link. No password to remember.",
    } as I18nText,
    email: { da: "E-mail", en: "Email" } as I18nText,
    submit: { da: "Send link", en: "Send link" } as I18nText,
    sending: { da: "Sender…", en: "Sending…" } as I18nText,
    sentTitle: { da: "Tjek din indbakke.", en: "Check your inbox." } as I18nText,
    sentText: {
      da: "Hvis adressen har adgang til huset, er der et link på vej. Det virker i en time og kun én gang.",
      en: "If the address has access to the house, a link is on its way. It works for one hour and only once.",
    } as I18nText,
    again: { da: "Bed om et nyt link", en: "Ask for a new link" } as I18nText,
    noAccessTitle: { da: "Ingen adgang endnu?", en: "No access yet?" } as I18nText,
    noAccessText: {
      da: "Kunder får adgang til de fulde CV'er efter aftale med huset. Specialister får adgang, når de er optaget.",
      en: "Clients get access to the full CVs by agreement with the house. Specialists get access once admitted.",
    } as I18nText,
    contact: { da: "Skriv til huset", en: "Write to the house" } as I18nText,
    apply: { da: "Søg optagelse", en: "Apply for a seat" } as I18nText,
    errors: {
      email: { da: "Skriv en gyldig e-mailadresse.", en: "Enter a valid email address." } as I18nText,
      rate: { da: "Vent et minut, før du beder om et nyt link.", en: "Wait a minute before asking for a new link." } as I18nText,
      failed: { da: "Vi kunne ikke sende linket. Prøv igen om lidt.", en: "We could not send the link. Try again shortly." } as I18nText,
      link: { da: "Linket er brugt eller udløbet. Bed om et nyt.", en: "That link has been used or has expired. Ask for a new one." } as I18nText,
    },
  },
  portal: {
    nav: { da: "Portal", en: "Portal" } as I18nText,
    eyebrow: { da: "Portalen", en: "The portal" } as I18nText,
    hello: { da: "Hej {name}", en: "Hello {name}" } as I18nText,
    signedInAs: { da: "Logget ind som", en: "Signed in as" } as I18nText,
    yourRoles: { da: "Dine roller", en: "Your roles" } as I18nText,
    noRoles: {
      da: "Din konto er oprettet, men har ingen roller endnu. Skriv til huset, hvis det er en fejl.",
      en: "Your account exists but has no roles yet. Write to the house if that is a mistake.",
    } as I18nText,
    denied: { da: "Du har ikke adgang til den side.", en: "You do not have access to that page." } as I18nText,
    comingTitle: { da: "Hvad der kommer her", en: "What lands here" } as I18nText,
    coming: [
      { da: "Fulde CV'er for kunder (2.4)", en: "Full CVs for clients (2.4)" },
      { da: "Mødeforespørgsler og svar (2.5)", en: "Booking requests and replies (2.5)" },
    ] as I18nText[],
    signOut: { da: "Log ud", en: "Sign out" } as I18nText,
    toSite: { da: "Til forsiden", en: "To the site" } as I18nText,
  },
  admin: {
    nav: { da: "Admin", en: "Admin" } as I18nText,
    eyebrow: { da: "Admin", en: "Admin" } as I18nText,
    title: { da: "Husets {em}kontor{/em}", en: "The house {em}office{/em}" } as I18nText,
    intro: {
      da: "Her styrer bestyrelsen adgang, ansøgninger, pladser og tekster. Det første, der virker, er listen over hvem der har adgang.",
      en: "Where the board manages access, applications, seats and copy. The first working part is the list of who has access.",
    } as I18nText,
    peopleTitle: { da: "Hvem har adgang", en: "Who has access" } as I18nText,
    peopleEmpty: { da: "Ingen personer endnu.", en: "No people yet." } as I18nText,
    columns: {
      name: { da: "Navn", en: "Name" } as I18nText,
      email: { da: "E-mail", en: "Email" } as I18nText,
      roles: { da: "Roller", en: "Roles" } as I18nText,
      signedIn: { da: "Konto", en: "Account" } as I18nText,
    },
    linked: { da: "Konto oprettet", en: "Account created" } as I18nText,
    notLinked: { da: "Ingen konto endnu", en: "No account yet" } as I18nText,
    grantHint: {
      da: "Roller gives indtil videre med scriptet pnpm roles (se docs/runbooks/auth.md). Editoren kommer i 2.2.",
      en: "Roles are granted with the pnpm roles script for now (see docs/runbooks/auth.md). The editor lands in 2.2.",
    } as I18nText,
    comingTitle: { da: "Kommer i 2.2", en: "Coming in 2.2" } as I18nText,
    coming: [
      { da: "Ansøgninger: kø, noter, afgørelse", en: "Applications: queue, notes, decision" },
      { da: "Henvendelser fra kunder", en: "Client enquiries" },
      { da: "Domænetekster på dansk og engelsk", en: "Domain copy in Danish and English" },
      { da: "Pladser: åbn, reservér, aktivér, luk", en: "Seats: open, reserve, activate, close" },
      { da: "Tal fra huset", en: "Numbers from the house" },
    ] as I18nText[],
  },
  roles: {
    visitor: { da: "Besøgende", en: "Visitor" },
    client: { da: "Kunde", en: "Client" },
    specialist: { da: "Specialist", en: "Specialist" },
    domain_lead: { da: "Domæneansvarlig", en: "Domain lead" },
    board: { da: "Bestyrelse", en: "Board" },
    admin: { da: "Admin", en: "Admin" },
  } as Record<Role, I18nText>,
};
