export interface DynamicBrandRule {
  brand: string;
  matches: string[];
  priority: number;
}

/**
 * Derives the brand name from a device model string using dynamic rules.
 * If no rules match or rules array is empty, falls back safely to 'Other'.
 */
export function getBrandFromModel(
  model: string,
  rules: DynamicBrandRule[] = [],
): string {
  if (!model) return 'Other';
  const normalized = model.toLowerCase();

  for (const entry of rules) {
    if (
      entry.matches.some((keyword) =>
        normalized.includes(keyword.toLowerCase().trim()),
      )
    ) {
      return entry.brand;
    }
  }

  return 'Other';
}

/**
 * Groups an array of model strings into their matching brands
 * based on dynamic metaobject rules from Shopify Admin.
 *
 * - Deduplicates model names.
 * - Sorts available brands strictly by the priority set by the client in Shopify Admin.
 * - Leaves unknown devices categorized under 'Other' at the end.
 */
export function groupModelsByBrand(
  models: string[],
  rules: DynamicBrandRule[] = [],
): {
  availableBrands: string[];
  modelsByBrand: Record<string, string[]>;
} {
  const brandMap: Record<string, string[]> = {};

  for (const model of models) {
    const brand = getBrandFromModel(model, rules);
    if (!brandMap[brand]) {
      brandMap[brand] = [];
    }
    // Prevent duplicate entries if variants share model names
    if (!brandMap[brand].includes(model)) {
      brandMap[brand].push(model);
    }
  }

  // Ordered list of brand names according to display priority
  const orderedBrandNames = rules.map((r) => r.brand);

  const availableBrands = Object.keys(brandMap).sort((a, b) => {
    const indexA = orderedBrandNames.indexOf(a);
    const indexB = orderedBrandNames.indexOf(b);

    // If both are custom/unmatched brands, alphabetize them
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    // Unmatched brands go to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  return {
    availableBrands,
    modelsByBrand: brandMap,
  };
}
