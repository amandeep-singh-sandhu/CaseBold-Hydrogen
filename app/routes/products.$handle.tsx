import {
  Link,
  useNavigate,
  useLoaderData,
  useRouteLoaderData,
  useLocation,
} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  CartForm,
} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Button} from '~/components/Button';
import type {RootLoader} from '~/root';
import {useState, useEffect, useMemo} from 'react';

export const meta: Route.MetaFunction = ({loaderData}) => {
  return [
    {title: `Hydrogen | ${loaderData?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${loaderData?.product.handle}`,
    },
  ];
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
  const location = useLocation();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedCart, setResolvedCart] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  // Safely resolve cart promise across React 18/19
  useEffect(() => {
    if (!rootData?.cart) return;

    if (typeof (rootData.cart as any).then === 'function') {
      (rootData.cart as Promise<any>).then((cartData) => {
        setResolvedCart(cartData);
      });
    } else {
      setResolvedCart(rootData.cart);
    }
  }, [rootData?.cart]);

  // Hydrogen optimistic variant resolution
  const optimisticVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(optimisticVariant.selectedOptions);

  // Cross-reference with all fetched variants to ensure quantityAvailable is always present
  const allVariants = useMemo(
    () => product.variants?.nodes ?? [],
    [product.variants],
  );

  // console.log(allVariants);

  const selectedVariant = useMemo(() => {
    const matched = allVariants.find(
      (v: any) => v.id === optimisticVariant?.id,
    );
    return matched || optimisticVariant;
  }, [allVariants, optimisticVariant]);

  // 1. Stock calculations for CURRENT active variant
  const isAvailable = Boolean(selectedVariant?.availableForSale);
  const rawQuantity = selectedVariant?.quantityAvailable;

  // Tracked only if Shopify returned a numeric quantity
  const isQuantityTracked = typeof rawQuantity === 'number';
  const maxAvailable = isQuantityTracked ? rawQuantity : isAvailable ? 99 : 0;

  // 2. Existing quantity of THIS variant in cart
  const currentCartLine = resolvedCart?.lines?.nodes?.find(
    (line: any) => line.merchandise?.id === selectedVariant?.id,
  );
  const currentCartQuantity = currentCartLine?.quantity ?? 0;

  // 3. Remaining quantity available to purchase
  const remainingStock = isQuantityTracked
    ? Math.max(0, maxAvailable - currentCartQuantity)
    : isAvailable
      ? 99
      : 0;

  // Out of stock if availableForSale is false OR remaining stock is 0
  const isOutOfStock =
    !isAvailable || (isQuantityTracked && remainingStock <= 0);

  // Reset selected quantity whenever the active variant changes
  useEffect(() => {
    setErrorMessage(null);
    if (isOutOfStock) {
      setSelectedQuantity(0);
    } else {
      setSelectedQuantity(1);
    }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setSelectedQuantity(1);
    } else if (val > remainingStock) {
      setSelectedQuantity(remainingStock);
      setErrorMessage(
        `Capped at maximum available quantity (${remainingStock}).`,
      );
    } else {
      setSelectedQuantity(val);
      setErrorMessage(null);
    }
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <Link
          to="/products"
          className="text-sm font-medium text-gray-500 hover:text-black inline-flex items-center gap-1 transition-colors"
        >
          &larr; Back to all products
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
          {selectedVariant?.image?.url ? (
            <img
              src={selectedVariant.image.url}
              alt={selectedVariant.image.altText ?? product.title}
              className="w-full h-full object-cover object-center"
              sizes=''
            />
          ) : (
            <span className="text-gray-400 text-sm">No Image</span>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          {/* Dynamic Stock Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs uppercase tracking-wider font-semibold ${
                isOutOfStock
                  ? 'text-red-500'
                  : isQuantityTracked && remainingStock <= 5
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            >
              {isOutOfStock
                ? 'Out of Stock'
                : isQuantityTracked && remainingStock <= 5
                  ? `Only ${remainingStock} left in stock!`
                  : 'In Stock & Ready to Ship'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
            {product.title}
          </h1>

          <div className="text-2xl font-bold text-gray-900 mb-6">
            {selectedVariant?.price.amount}{' '}
            {selectedVariant?.price.currencyCode}
          </div>

          {/* Model / Variant Buttons */}
          {product.options && product.options.length > 0 && (
            <div className="flex flex-col gap-4 mb-6 border-b border-gray-100 pb-6">
              {product.options
                .filter((option: any) => option.name !== 'Title')
                .map((option: any) => {
                  const currentSelected =
                    selectedVariant?.selectedOptions?.find(
                      (sel: any) => sel.name === option.name,
                    )?.value;

                  return (
                    <div key={option.name} className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {option.name}:{' '}
                        <span className="text-gray-900 font-bold">
                          {currentSelected || option.optionValues?.[0]?.name}
                        </span>
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {option.optionValues?.map((val: any) => {
                          const valName = val.name;
                          const isSelected = currentSelected === valName;

                          const searchParams = new URLSearchParams(
                            location.search,
                          );
                          searchParams.set(option.name, valName);

                          return (
                            <Link
                              key={valName}
                              to={`?${searchParams.toString()}`}
                              preventScrollReset
                              replace
                              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-black text-white border-black shadow-sm'
                                  : 'bg-white text-gray-800 border-gray-300 hover:border-black'
                              }`}
                            >
                              {valName}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <p className="text-base text-gray-600 leading-relaxed mb-6">
            {product.description}
          </p>

          <div className="border-t border-b border-gray-100 py-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Highlights
            </h3>
            <p className="text-sm text-gray-600">{product.vendor}</p>
          </div>

          {/* Quantity Controls (Hidden when out of stock) */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Quantity (Max: {remainingStock})
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg w-fit bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={selectedQuantity <= 1}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold"
                >
                  &#8722;
                </button>
                <input
                  type="number"
                  min={1}
                  max={remainingStock}
                  value={selectedQuantity}
                  onChange={handleInputChange}
                  className="w-14 h-10 text-center font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm"
                />
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={selectedQuantity >= remainingStock}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold"
                >
                  &#43;
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-600">
              {errorMessage}
            </div>
          )}

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
                    className="w-full sm:w-auto py-3 px-8 text-base shadow-sm hover:shadow active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
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

            <Link to="/cart" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                className="w-full py-3 px-8 text-base"
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
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
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
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 50) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
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
