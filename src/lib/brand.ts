export const BRAND = {
  name: "Robot Fan Club",
  tagline: "Make the robots your biggest fans.",
} as const;

// Where "Start a fan club" sends people. Empty for now (no contact email yet): the button then scrolls to the section.
export const CONTACT_EMAIL = "";
export const contactHref = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : "#join";
