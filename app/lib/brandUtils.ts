/**
 * Strict display order for the Brand dropdown
 */
export const ORDERED_BRANDS = [
  'Apple',
  'Samsung',
  'Vivo',
  'Xiaomi',
  'Oppo',
] as const;

export type SupportedBrand = (typeof ORDERED_BRANDS)[number] | 'Other';

/**
 * Matching patterns for device brands.
 * Uses exact brand prefixes and common sub-brand keywords.
 */
const BRAND_PATTERNS: Array<{
  brand: (typeof ORDERED_BRANDS)[number];
  matches: string[];
}> = [
  {
    brand: 'Apple',
    matches: ['iphone', 'apple'],
  },
  {
    brand: 'Samsung',
    matches: ['galaxy', 'samsung', 'z fold', 'z flip'],
  },
  {
    brand: 'Vivo',
    matches: ['vivo'],
  },
  {
    brand: 'Xiaomi',
    matches: ['xiaomi', 'redmi', 'poco', 'mi '],
  },
  {
    brand: 'Oppo',
    matches: ['oppo', 'find n', 'find x', 'reno'],
  },
];

/**
 * Derives the brand name from a device model option value string.
 */
export function getBrandFromModel(model: string): SupportedBrand {
  if (!model) return 'Other';
  const normalized = model.toLowerCase();

  for (const entry of BRAND_PATTERNS) {
    if (entry.matches.some((keyword) => normalized.includes(keyword))) {
      return entry.brand;
    }
  }

  return 'Other';
}

/**
 * Groups an array of model strings into their matching brands
 * and sorts the brands according to ORDERED_BRANDS.
 */
export function groupModelsByBrand(models: string[]): {
  availableBrands: string[];
  modelsByBrand: Record<string, string[]>;
} {
  const brandMap: Record<string, string[]> = {};

  for (const model of models) {
    const brand = getBrandFromModel(model);
    if (!brandMap[brand]) {
      brandMap[brand] = [];
    }
    // Prevent duplicate entries if variants share model names
    if (!brandMap[brand].includes(model)) {
      brandMap[brand].push(model);
    }
  }

  // Sort available brands matching the canonical brand order
  const availableBrands = Object.keys(brandMap).sort((a, b) => {
    const indexA = ORDERED_BRANDS.indexOf(a as any);
    const indexB = ORDERED_BRANDS.indexOf(b as any);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return {
    availableBrands,
    modelsByBrand: brandMap,
  };
}
