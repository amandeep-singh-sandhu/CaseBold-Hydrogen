import {
  Link,
  useNavigate,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  CartForm,
  Money,
} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Button} from '~/components/Button';
import {ProductGallery} from '~/components/product/ProductGallery';
import {DeviceStyleSelector} from '~/components/product/DeviceStyleSelector';
import {QuantityStepper} from '~/components/product/QuantityStepper';
import type {RootLoader} from '~/root';
import {useState, useEffect, useMemo} from 'react';

export const meta: Route.MetaFunction = ({loaderData}) => {
  return [
    {title: `CaseBold | ${loaderData?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${loaderData?.product.handle}`,
    },
  ];
};

// Edge cache: 1 minute stale-while-revalidate for snappy back/forward navigation
export const headers: Route.HeadersFunction = () => {
  return {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
  };
};

export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args);
  return {...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions: getSelectedProductOptions(request),
      },
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {product};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedCart, setResolvedCart] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  // Non-blocking cart retrieval
  useEffect(() => {
    if (!rootData?.cart) return;
    if (typeof (rootData.cart as any).then === 'function') {
      (rootData.cart as Promise<any>).then(setResolvedCart);
    } else {
      setResolvedCart(rootData.cart);
    }
  }, [rootData?.cart]);

  // Hydrogen optimistic variant handling
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const allVariants = useMemo(
    () => product.variants?.nodes ?? [],
    [product.variants],
  );

  const currentModel =
    selectedVariant?.selectedOptions?.find(
      (opt: any) =>
        opt.name.toLowerCase() === 'model' ||
        opt.name.toLowerCase() === 'device',
    )?.value || '';

  // Companion style items
  const relatedStyles = useMemo(() => {
    const current = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage,
      isCurrent: true,
    };

    const companions =
      product.relatedStyles?.references?.nodes?.map((ref: any) => ({
        id: ref.id,
        handle: ref.handle,
        title: ref.title,
        image: ref.featuredImage,
        isCurrent: false,
      })) || [];

    return [current, ...companions];
  }, [product]);

  // Stock calculations
  const isAvailable = Boolean(selectedVariant?.availableForSale);
  const rawQuantity = selectedVariant?.quantityAvailable;
  const isQuantityTracked = typeof rawQuantity === 'number';
  const maxAvailable = isQuantityTracked ? rawQuantity : isAvailable ? 99 : 0;

  const currentCartLine = resolvedCart?.lines?.nodes?.find(
    (line: any) => line.merchandise?.id === selectedVariant?.id,
  );
  const currentCartQuantity = currentCartLine?.quantity ?? 0;

  const remainingStock = isQuantityTracked
    ? Math.max(0, maxAvailable - currentCartQuantity)
    : isAvailable
      ? 99
      : 0;

  const isOutOfStock =
    !isAvailable || (isQuantityTracked && remainingStock <= 0);

  useEffect(() => {
    setErrorMessage(null);
    setSelectedQuantity(isOutOfStock ? 0 : 1);
  }, [selectedVariant?.id, isOutOfStock]);

  const handleDecrease = () => {
    setSelectedQuantity((prev) => Math.max(1, prev - 1));
    setErrorMessage(null);
  };

  const handleIncrease = () => {
    if (selectedQuantity >= remainingStock) {
      setErrorMessage(`Only ${remainingStock} items currently available.`);
      return;
    }
    setSelectedQuantity((prev) => prev + 1);
    setErrorMessage(null);
  };

  const lines =
    selectedVariant?.id && selectedQuantity > 0
      ? [
          {
            merchandiseId: selectedVariant.id,
            quantity: selectedQuantity,
          },
        ]
      : [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-white">
      <div className="mb-6">
        <Link
          to="/products"
          prefetch="intent"
          className="text-sm font-medium text-neutral-400 hover:text-black inline-flex items-center gap-1 transition-colors"
        >
          &larr; Back to all products
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Gallery Subcomponent */}
        <ProductGallery
          image={selectedVariant?.image}
          fallbackImage={product.featuredImage}
          title={product.title}
        />

        {/* Product Details & Configurator */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs uppercase tracking-wider font-semibold ${
                isOutOfStock
                  ? 'text-red-400'
                  : isQuantityTracked && remainingStock <= 5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {isOutOfStock
                ? 'Out of Stock'
                : isQuantityTracked && remainingStock <= 5
                  ? `Only ${remainingStock} left in stock!`
                  : 'In Stock & Ready to Ship'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-black tracking-tight mb-3">
            {product.title}
          </h1>

          <div className="text-2xl font-bold text-black mb-6">
            <Money data={selectedVariant?.price} />
          </div>

          {/* Configurator Subcomponent */}
          <DeviceStyleSelector
            product={product}
            currentModel={currentModel}
            allVariants={allVariants}
            relatedStyles={relatedStyles}
          />

          <p className="text-base text-neutral-400 leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Quantity Controls */}
          {!isOutOfStock && (
            <QuantityStepper
              quantity={selectedQuantity}
              max={remainingStock}
              onDecrease={handleDecrease}
              onIncrease={handleIncrease}
            />
          )}

          {errorMessage && (
            <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-800 text-xs font-medium text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Add to Cart Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesAdd}
              inputs={{lines}}
            >
              {(fetcher) => {
                const isSubmitting = fetcher.state !== 'idle';
                return (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      isOutOfStock || isSubmitting || lines.length === 0
                    }
                    onClick={(e) => {
                      if (isOutOfStock || selectedQuantity > remainingStock) {
                        e.preventDefault();
                        setErrorMessage(
                          `Cannot add more than ${remainingStock} items to cart.`,
                        );
                        return;
                      }
                      setErrorMessage(null);
                      setTimeout(() => navigate('/cart'), 300);
                    }}
                    className="w-full sm:w-auto py-3 px-8 text-base bg-black font-bold shadow-sm hover:bg-gray-400 active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? 'Adding...'
                      : isOutOfStock
                        ? 'Sold Out'
                        : `Add ${selectedQuantity} to Cart`}
                  </Button>
                );
              }}
            </CartForm>

            <Link to="/cart" prefetch="intent" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                className="w-full py-3 px-8 text-base border-neutral-700 hover:bg-neutral-800 hover:text-white text-black"
              >
                Go to Cart
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    quantityAvailable
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
    sku
    title
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    featuredImage {
      id
      url
      altText
      width
      height
    }
    relatedStyles: metafield(namespace: "custom", key: "related_styles") {
      references(first: 10) {
        nodes {
          ... on Product {
            id
            title
            handle
            featuredImage {
              id
              url
              altText
              width
              height
            }
          }
        }
      }
    }
    options {
      name
      optionValues {
        name
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 100) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
