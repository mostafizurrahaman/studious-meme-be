export const PageSlugs = {
  ABOUT_US: 'about-us',
  PRIVACY_POLICY: 'privacy-policy',
  TERMS_AND_CONDITIONS: 'terms-and-conditions',
  RETURN_POLICY: 'return-policy',
} as const;

export type TPageSlugs = (typeof PageSlugs)[keyof typeof PageSlugs];
