/**
 * Constant folder paths for Cloudflare R2 storage by module.
 * Fixed in code as per architecture requirements (not loaded from environment variables).
 */
export const R2_FOLDERS = {
  PRODUCT: 'products',
  CATEGORY: 'categories',
  BRAND: 'brands',
  USER: 'users',
  ADMIN: 'admins',
  HERO_SECTION: 'hero-sections',
  REVIEW: 'reviews',
} as const;

export type TR2Folder = (typeof R2_FOLDERS)[keyof typeof R2_FOLDERS];
