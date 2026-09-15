const BRAND_PATTERNS: Array<{brand: string; matches: string[]}> = [
  {brand: 'Apple', matches: ['iphone', 'apple']},
  {brand: 'Samsung', matches: ['galaxy', 'samsung']},
  {brand: 'Google', matches: ['pixel', 'google']},
  {brand: 'Realme', matches: ['realme']},
  {brand: 'OnePlus', matches: ['oneplus', 'one plus']},
  {brand: 'Xiaomi', matches: ['xiaomi', 'redmi', 'mi ']},
];

export function getBrandFromModel(model: string): string {
  const normalized = model.toLowerCase();
  for (const entry of BRAND_PATTERNS) {
    if (entry.matches.some((keyword) => normalized.includes(keyword))) {
      return entry.brand;
    }
  }
  return 'Other';
}

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
    brandMap[brand].push(model);
  }

  return {
    availableBrands: Object.keys(brandMap),
    modelsByBrand: brandMap,
  };
}
