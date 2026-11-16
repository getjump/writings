import cv from "../data/cv.json";

export const profile = cv;
export const personId = `${profile.basics.url}#person`;
export const availability = "Based in Belgrade, Serbia. Open to senior Go/backend roles, remote work, B2B contracts and relocation with work-permit sponsorship.";

export const person = {
  "@type": "Person",
  "@id": personId,
  name: profile.basics.name,
  alternateName: "getjump",
  url: profile.basics.url,
  jobTitle: profile.basics.label,
  description: profile.basics.summary,
  email: profile.basics.email,
  homeLocation: {
    "@type": "Place",
    name: `${profile.basics.location.city}, Serbia`,
  },
  sameAs: profile.basics.profiles.map((entry) => entry.url),
  knowsAbout: profile.skills.flatMap((skill) => skill.keywords),
  knowsLanguage: profile.languages.map((entry) => entry.language),
  subjectOf: {
    "@type": "DigitalDocument",
    url: profile.meta.canonical,
    encodingFormat: "application/json",
    name: `${profile.basics.name} - public CV`,
  },
};

export function formatDate(value: string) {
  if (value.length === 4) return value;
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
