import type {LoaderFunctionArgs} from 'react-router';
import {ORDERED_BRANDS} from '~/lib/brandUtils';

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

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const rawTerm = url.searchParams.get('q')?.trim() || '';

  if (!rawTerm) {
    return Response.json({products: [], queries: []});
  }

  const {storefront} = context;
  const lower = rawTerm.toLowerCase();

  // 1. Check if user typed a brand or sub-brand handled by brandUtils
  let brandMatchQuery: string | null = null;
  if (lower.includes('samsung') || lower.includes('galaxy')) {
    brandMatchQuery =
      'variants.title:Galaxy* OR variants.title:Samsung* OR Samsung';
  } else if (lower.includes('apple') || lower.includes('iphone')) {
    brandMatchQuery =
      'variants.title:iPhone* OR variants.title:Apple* OR iPhone';
  } else if (
    lower.includes('xiaomi') ||
    lower.includes('redmi') ||
    lower.includes('poco')
  ) {
    brandMatchQuery =
      'variants.title:Xiaomi* OR variants.title:Redmi* OR variants.title:POCO*';
  } else if (lower.includes('vivo')) {
    brandMatchQuery = 'variants.title:Vivo*';
  } else if (lower.includes('oppo') || lower.includes('reno')) {
    brandMatchQuery = 'variants.title:Oppo* OR variants.title:Reno*';
  }

  // 2. Query products using the brand search term or raw user query
  const queryToExecute = brandMatchQuery || `*${rawTerm}*`;

  const data = await storefront.query(SEARCH_PRODUCTS_QUERY, {
    variables: {query: queryToExecute},
  });

  let products = data.products?.nodes ?? [];

  // 3. Fallback: if specific variant filter returns empty, fetch open products
  if (products.length === 0 && brandMatchQuery) {
    const fallback = await storefront.query(SEARCH_PRODUCTS_QUERY, {
      variables: {query: rawTerm},
    });
    products = fallback.products?.nodes ?? [];
  }

  // Auto-generate brand suggestions if typed term matches a brand
  const matchingBrands = ORDERED_BRANDS.filter((b) =>
    b.toLowerCase().includes(lower),
  ).map((b) => ({text: `${b} Cases`}));

  return Response.json({
    products,
    queries: matchingBrands,
  });
}
