// Bump TERMS_VERSION whenever you change the Terms or Privacy Policy in a way
// users should re-accept. It is saved on each user's doc at signup, so you can
// later compare it and re-prompt anyone on an older version.
export const TERMS_VERSION = "2026-10-22";

// TODO: replace with a real address before publishing.
const CONTACT_EMAIL = "YOUR_CONTACT_EMAIL";

export type LegalSection = { heading: string; body: string };
export type LegalDoc = { title: string; sections: LegalSection[] };

// TEMPLATE TEXT: review every line against what the app actually does before
// you publish it, and update it whenever the app's data practices change.
export const LEGAL_DOCS: Record<"terms" | "privacy", LegalDoc> = {
  terms: {
    title: "Terms of Service",
    sections: [
      {
        heading: "Agreement",
        body: "By creating an account or using Scented Roots, you agree to these Terms and to the Privacy Policy. If you do not agree, please do not use the app.",
      },
      {
        heading: "Who can use the app",
        body: "You must be at least 13 years old to create an account.",
      },
      {
        heading: "Your account",
        body: "Give accurate information when you sign up, and verify your email address. Keep your password private. You are responsible for activity on your account.",
      },
      {
        heading: "Your content",
        body: "You keep ownership of the photos, captions, comments, and profile details you add. By posting them, you let us store them and show them to other users of the app as the app is designed to do. Only post content you have the right to share.",
      },
      {
        heading: "Acceptable use",
        body: "Do not post content that is unlawful, harassing, hateful, sexually explicit, or violent. Do not impersonate other people, post content you do not have the rights to, send spam, scrape the app, or try to break or bypass its security.",
      },
      {
        heading: "Reporting and removal",
        body: `We may remove content or suspend accounts that break these rules. To report content or a user, email ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Fragrance information",
        body: "Fragrance names, brands, and notes in the catalog are for general information and may be inaccurate or incomplete. Scented Roots is not affiliated with any fragrance brand. Brand names belong to their owners.",
      },
      {
        heading: "Ending your account",
        body: `You can stop using the app at any time. To delete your account and data, email ${CONTACT_EMAIL}. We may suspend or remove accounts that violate these Terms.`,
      },
      {
        heading: "No warranty",
        body: "The app is provided as is, without warranties of any kind. Features may change, and the service may be interrupted or discontinued. To the extent the law allows, we are not liable for losses that result from using the app.",
      },
      {
        heading: "Changes to these Terms",
        body: "We may update these Terms. The date at the top shows the current version. If we make a significant change, we will ask you to accept it again. Continuing to use the app after a change means you accept the new version.",
      },
      {
        heading: "Contact",
        body: `Questions about these Terms: ${CONTACT_EMAIL}.`,
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        heading: "What we collect",
        body: "Account details: your email address and password. Your password is handled by Firebase Authentication, and we never see it.\n\nProfile details: your display name, bio, and profile photo.\n\nContent you create: fragrances in your collection (with notes and photos), posts, captions, comments, and who you follow.\n\nConsent record: the date you accepted our Terms and which version you accepted.",
      },
      {
        heading: "How we use it",
        body: "We use your information to run the app, to verify your email, to keep your account secure, and to show your profile and posts to other users. We do not sell your data and we do not show ads.",
      },
      {
        heading: "What other users can see",
        body: "Your display name, bio, profile photo, collection, posts, comments, and follower counts can be seen by other users of the app. Your email address is used for login and account messages.",
      },
      {
        heading: "Service providers",
        body: "We use Google Firebase to handle sign-in and store app data, and Cloudinary to store and deliver images. These providers process your data to operate the app under their own terms and privacy policies.",
      },
      {
        heading: "Cookies and tracking",
        body: "The mobile app does not use cookies or third-party advertising trackers, and it does not currently use analytics. If we add analytics later, we will ask for your permission first.",
      },
      {
        heading: "Device permissions",
        body: "The app asks for access to your photo library only when you choose to add a photo. We upload only the photo you select.",
      },
      {
        heading: "Keeping and deleting your data",
        body: `We keep your data while your account exists. To delete your account and the data tied to it, email ${CONTACT_EMAIL}.`,
      },
      {
        heading: "Security",
        body: "We use Firebase's security features to protect your account. No online service is perfectly secure, so please use a strong, unique password.",
      },
      {
        heading: "Children",
        body: "The app is not for children under 13. If we learn that a child under 13 has an account, we will delete it.",
      },
      {
        heading: "Changes to this policy",
        body: "We may update this policy. The date at the top shows the current version, and we will ask you to review significant changes.",
      },
      {
        heading: "Contact",
        body: `Questions about privacy: ${CONTACT_EMAIL}.`,
      },
    ],
  },
};