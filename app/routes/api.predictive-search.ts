import type {LoaderFunctionArgs} from 'react-router';
import {BRAND_RULES_QUERY} from '~/lib/fragments';

const SEARCH_PRODUCTS_QUERY = `#graphql
  query SearchProducts($query: String!) {
    products(first: 6, query: $query) {
      nodes {
        id
        title
        handle
        featuredImage {
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

/**
 * Calculates Levenshtein edit distance between two strings
 */
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const rawTerm = url.searchParams.get('q')?.trim() || '';

  if (!rawTerm) {
    return Response.json({products: [], queries: []});
  }

  const {storefront} = context;
  const lower = rawTerm.toLowerCase();

  // 1. Fetch Dynamic Brand Rules from Metaobjects
  let rules: Array<{brand: string; matches: string[]}> = [];
  try {
    const brandRulesData = await storefront.query(BRAND_RULES_QUERY, {
      cache: storefront.CacheLong(),
      variables: {first: 25},
    });

    const rawNodes = (brandRulesData?.metaobjects?.nodes ?? []) as Array<{
      brandName?: {value?: string} | null;
      matches?: {value?: string} | null;
    }>;

    rules = rawNodes.map((node) => {
      let parsedMatches: string[] = [];
      if (node.matches?.value) {
        try {
          const parsed = JSON.parse(node.matches.value);
          if (Array.isArray(parsed)) parsedMatches = parsed as string[];
        } catch {
          parsedMatches = [];
        }
      }
      return {
        brand: node.brandName?.value || '',
        matches: parsedMatches,
      };
    });
  } catch (err) {
    console.error('Error fetching brand rules:', err);
  }

  // 2. Build Dictionary of Known Keywords (Brands, Metaobject Aliases, and Common Styles)
  const styleKeywords = [
    'marble',
    'leopard',
    'hearts',
    'floral',
    'chrome',
    'magsafe',
  ];
  const allBrandKeywords = rules.flatMap((r) => [
    r.brand.toLowerCase(),
    ...r.matches.map((m) => m.toLowerCase()),
  ]);
  const dictionary = Array.from(
    new Set([...allBrandKeywords, ...styleKeywords]),
  );

  // 3. Typo Correction: Find the closest word if user made a 1-2 character mistake
  let correctedTerm = lower;
  if (!dictionary.includes(lower) && lower.length >= 4) {
    let closestWord = '';
    let minDistance = 3; // allow up to 2 typos

    for (const word of dictionary) {
      const distance = getLevenshteinDistance(lower, word);
      if (distance < minDistance) {
        minDistance = distance;
        closestWord = word;
      }
    }

    if (closestWord) {
      correctedTerm = closestWord;
    }
  }

  // 4. Check if Search Term (or Corrected Term) matches a Brand Rule
  const matchedRule = rules.find((r) => {
    if (!r.brand) return false;
    const isBrand =
      r.brand.toLowerCase() === correctedTerm ||
      r.brand.toLowerCase().includes(correctedTerm);
    const isKeyword = r.matches.some(
      (m) =>
        m.toLowerCase() === correctedTerm ||
        correctedTerm.includes(m.toLowerCase().trim()),
    );
    return isBrand || isKeyword;
  });

  let products: any[] = [];

  // 5. Query Strategy
  if (matchedRule) {
    // When a brand matches (e.g. "apple" or typo "iphome"), prioritize its actual variant keyword (e.g. "iphone")
    const validMatches = matchedRule.matches.filter(
      (m) => m.toLowerCase().trim() !== matchedRule.brand.toLowerCase().trim(),
    );
    const queryTarget = validMatches[0] || matchedRule.brand;

    const brandData = await storefront.query(SEARCH_PRODUCTS_QUERY, {
      variables: {query: `${queryTarget}*`},
    });
    products = brandData.products?.nodes ?? [];
  }

  // Fallback to searching the corrected term or raw input directly
  if (products.length === 0) {
    const directData = await storefront.query(SEARCH_PRODUCTS_QUERY, {
      variables: {query: `${correctedTerm}*`},
    });
    products = directData.products?.nodes ?? [];
  }

  // Final fallback to raw user input with broad wildcard
  if (products.length === 0 && correctedTerm !== lower) {
    const rawData = await storefront.query(SEARCH_PRODUCTS_QUERY, {
      variables: {query: `*${rawTerm}*`},
    });
    products = rawData.products?.nodes ?? [];
  }

  return Response.json({
    products,
    queries: matchedRule
      ? [{text: `${matchedRule.brand} Cases`}]
      : correctedTerm !== lower
        ? [{text: `Did you mean "${correctedTerm}"?`}]
        : [],
  });
}
