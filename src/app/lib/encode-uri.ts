export const encodeSlugUri = (slug: string) => {
  return encodeURI(slug).replace(/%[0-9a-fA-F]{2}/g, m => m.toLowerCase());
};
