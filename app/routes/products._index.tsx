import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/products._index';
import {Image, Money} from '@shopify/hydrogen';
import type { CurrencyCode } from '@shopify/hydrogen/storefront-api-types';

interface CatalogProduct {
  id: string;
  title: string;
  handle: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: CurrencyCode;
    };
  };
  featuredImage?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
}

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'All Products | CaseBold'},
    {description: 'Explore durable, drop-tested designer cases.'},
  ];
};

export async function loader(
  args: Route.LoaderArgs,
): Promise<{products: CatalogProduct[]}> {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({
  context,
}: Route.LoaderArgs): Promise<{products: CatalogProduct[]}> {
  const {products} = await context.storefront.query(ALL_PRODUCTS_QUERY, {
    variables: {first: 24},
  });

  return {
    products: products.nodes,
  };
}

export default function ProductsRoute() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 border-b border-neutral-800 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-black">
          All Products
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Explore durable, drop-tested designer cases.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-neutral-500 py-12 text-center">
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product: CatalogProduct) => (
            <div
              key={product.id}
              className="border border-neutral-800 rounded-xl p-4 flex flex-col bg-neutral-900/40 hover:border-neutral-700 transition-colors"
            >
              <div className="w-full h-64 bg-neutral-900 rounded-lg overflow-hidden mb-3 border border-neutral-800/80 flex items-center justify-center">
                {product.featuredImage ? (
                  <Image
                    data={product.featuredImage}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-neutral-600 text-xs uppercase tracking-wider font-semibold">
                    No Image
                  </span>
                )}
              </div>

              <h3 className="font-bold text-lg mb-1 text-white truncate">
                {product.title}
              </h3>

              <div className="mb-4 text-neutral-400 text-sm font-semibold">
                {product.priceRange?.minVariantPrice ? (
                  <Money data={product.priceRange.minVariantPrice} />
                ) : (
                  <span>Price unavailable</span>
                )}
              </div>

              <Link
                to={`/products/${product.handle}`}
                className="mt-auto text-center bg-white text-black py-2 rounded-lg font-medium hover:bg-neutral-200 transition-colors text-sm"
              >
                View Case
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  fragment CatalogProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query AllProducts(
    $first: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...CatalogProduct
      }
    }
  }
` as const;
