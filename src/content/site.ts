import type { I18nText } from "@/lib/i18n";

/** Interface copy shared by every page. Content Kim edits lives in the database. */
export const site = {
  name: "TrustUsConsult",
  initials: "TUC",
  email: {
    contact: "kontakt@trustusconsult.dk",
    admission: "optagelse@trustusconsult.dk",
  },
  nav: {
    forClients: { da: "For kunder", en: "For clients" } as I18nText,
    forFreelancers: { da: "For freelancere", en: "For freelancers" } as I18nText,
  },
  header: {
    bookMeeting: { da: "Book et møde", en: "Book a meeting" } as I18nText,
    apply: { da: "Søg optagelse", en: "Apply" } as I18nText,
    switchTo: { da: "English", en: "Dansk" } as I18nText,
    login: { da: "Log ind", en: "Sign in" } as I18nText,
    skip: { da: "Spring til indhold", en: "Skip to content" } as I18nText,
  },
  footer: {
    line: {
      da: "TrustUsConsult · Femten domæner, selvstændige specialister i ét hus",
      en: "TrustUsConsult · Fifteen domains, independent specialists in one house",
    } as I18nText,
    toTop: { da: "Til toppen", en: "Back to top" } as I18nText,
    utilities: [
      { key: "kontakt", label: { da: "Kontakt", en: "Contact" }, href: "#kontakt" },
      { key: "presse", label: { da: "Presse", en: "Press" }, href: "mailto:kontakt@trustusconsult.dk?subject=Presse" },
      { key: "privatliv", label: { da: "Privatliv", en: "Privacy" }, href: "/privatliv" },
      { key: "vilkaar", label: { da: "Vilkår", en: "Terms" }, href: "/vilkaar" },
    ] as { key: string; label: I18nText; href: string }[],
  },
  status: {
    needs: { da: "Søger specialister", en: "Recruiting" } as I18nText,
    healthy: { da: "Bemandet", en: "Staffed" } as I18nText,
    full: { da: "Fuldt booket", en: "Fully booked" } as I18nText,
  },
};
