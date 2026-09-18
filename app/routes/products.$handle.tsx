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
import {useAppDispatch} from '~/store';
import {openDrawer} from '~/store/drawerSlice';
import {
  getBrandFromModel,
  groupModelsByBrand,
  type DynamicBrandRule,
} from '~/lib/brandUtils';
import { BRAND_RULES_QUERY } from '~/lib/fragments';

export const meta: Route.MetaFunction = ({loaderData}) => {
  return [
    {title: `CaseBold | ${loaderData?.product.title ?? ''}`},
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

  const [{product}, brandRulesData] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    storefront.query(BRAND_RULES_QUERY, {
      cache: storefront.CacheLong(),
      variables: {first: 25},
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  const rawNodes = (brandRulesData?.metaobjects?.nodes ?? []) as Array<{
    brandName?: {value?: string} | null;
    matches?: {value?: string} | null;
    priority?: {value?: string} | null;
  }>;

  const brandRules = rawNodes
    .map((node) => {
      let parsedMatches: string[] = [];
      if (node.matches?.value) {
        try {
          const parsed = JSON.parse(node.matches.value);
          if (Array.isArray(parsed)) {
            parsedMatches = parsed as string[];
          }
        } catch {
          parsedMatches = [];
        }
      }

      return {
        brand: node.brandName?.value || '',
        matches: parsedMatches,
        priority: parseInt(node.priority?.value || '99', 10),
      };
    })
    .filter((rule): rule is DynamicBrandRule => Boolean(rule.brand))
    .sort((a, b) => a.priority - b.priority);

  return {
    product,
    brandRules,
  };
}

export default function Product() {
  const {product, brandRules} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedCart, setResolvedCart] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [isEditingQuantity, setIsEditingQuantity] = useState<boolean>(false);

  // console.log("#####", product);

  // Safely resolve cart promise across React 18 & 19
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

  const allModels: string[] = useMemo(() => {
    const modelOption = product.options?.find(
      (o: any) =>
        o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
    );
    return modelOption?.optionValues?.map((v: any) => v.name) || [];
  }, [product.options]);

  const {availableBrands, modelsByBrand} = useMemo(() => {
    return groupModelsByBrand(allModels, brandRules);
  }, [allModels, brandRules]);

  const currentBrand = useMemo(() => {
    if (!currentModel) return availableBrands[0] || '';
    const brand = getBrandFromModel(currentModel, brandRules);
    return availableBrands.includes(brand) ? brand : availableBrands[0] || '';
  }, [currentModel, availableBrands, brandRules]);

  const activeBrandModels = useMemo(() => {
    return modelsByBrand[currentBrand] || [];
  }, [modelsByBrand, currentBrand]);

  const isAvailable = Boolean(selectedVariant?.availableForSale);
  const rawQuantity = selectedVariant?.quantityAvailable;
  const isQuantityTracked = typeof rawQuantity === 'number';
  const maxAvailable = isQuantityTracked ? rawQuantity : isAvailable ? 1000 : 0;

  const currentCartLine = resolvedCart?.lines?.nodes?.find(
    (line: any) => line.merchandise?.id === selectedVariant?.id,
  );
  const currentCartQuantity = currentCartLine?.quantity ?? 0;

  const remainingStock = isQuantityTracked
    ? Math.max(0, maxAvailable - currentCartQuantity)
    : isAvailable
      ? 1000
      : 0;

  const isOutOfStock =
    !isAvailable || (isQuantityTracked && remainingStock <= 0);

  useEffect(() => {
    setErrorMessage(null);
    setSelectedQuantity(isOutOfStock ? 0 : 1);
  }, [selectedVariant?.id, isOutOfStock]);

  const handleBrandChange = (brand: string) => {
    const nextModels = modelsByBrand[brand] || [];
    if (nextModels.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const modelOptionName =
        product.options?.find(
          (o: any) =>
            o.name.toLowerCase() === 'model' ||
            o.name.toLowerCase() === 'device',
        )?.name || 'Model';

      searchParams.set(modelOptionName, nextModels[0]);
      navigate(`?${searchParams.toString()}`, {
        preventScrollReset: true,
        replace: true,
      });
    }
  };

  const handleModelChange = (model: string) => {
    const searchParams = new URLSearchParams(location.search);
    const modelOptionName =
      product.options?.find(
        (o: any) =>
          o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
      )?.name || 'Model';

    searchParams.set(modelOptionName, model);
    navigate(`?${searchParams.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  };

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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditingQuantity(false);
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          to="/collections"
          className="text-sm font-medium text-neutral-500 hover:text-black inline-flex items-center gap-1 transition-colors"
        >
          &larr; Back to all products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left: Product Artwork Showcase */}
        <div className="w-full aspect-square bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-xl flex items-center justify-center relative">
          {selectedVariant?.image?.url ? (
            <img
              src={selectedVariant.image.url}
              alt={selectedVariant.image.altText ?? product.title}
              className="w-full h-full object-cover object-center"
            />
          ) : product.featuredImage?.url ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="text-center p-8">
              <span className="text-3xl font-extrabold text-white tracking-wide">
                {product.title}
              </span>
            </div>
          )}
        </div>

        {/* Right: Configurator Column */}
        <div className="flex flex-col">
          {/* Stock Availability Badge */}
          <div className="mb-2">
            <span
              className={`text-xs uppercase tracking-wider font-bold ${
                isOutOfStock ? 'text-red-500' : 'text-emerald-500'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : 'IN STOCK & READY TO SHIP'}
            </span>
          </div>

          {/* Product Title & Price */}
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mb-2">
            {product.title} &ndash; $
            {Number(selectedVariant?.price.amount || 34.99).toFixed(2)}
          </h1>

          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            {product.description ||
              'Concentric banded mineral rings in rich forest and jade green tones with a glass-like finish.'}
          </p>

          {/* Device Selection Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 mt-6">
            <div>
              <label className="text-sm font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center">
                  1
                </span>
                SHOP BY DEVICE BRAND
              </label>
              <div className="relative">
                <select
                  value={currentBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full appearance-none bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-700 cursor-pointer"
                >
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center">
                  2
                </span>
                SELECT MODEL
              </label>
              <div className="relative">
                <select
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full appearance-none bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-700 cursor-pointer"
                >
                  {activeBrandModels.map((m) => {
                    const matchedVar = allVariants.find((v: any) =>
                      v.selectedOptions?.some((opt: any) => opt.value === m),
                    );
                    const soldOut =
                      !matchedVar?.availableForSale ||
                      (typeof matchedVar?.quantityAvailable === 'number' &&
                        matchedVar.quantityAvailable <= 0);

                    return (
                      <option key={m} value={m}>
                        {m} {soldOut ? '(Sold Out)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-sm font-bold uppercase text-neutral-500 mb-2">
                QUANTITY{' '}
                <span className="font-bold text-neutral-400 text-xs tracking-tighter">
                  (Max: {remainingStock})
                </span>
              </label>
              <div className="inline-flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={selectedQuantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-8 h-10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 font-bold text-sm transition-colors cursor-pointer"
                >
                  &#8722;
                </button>

                {isEditingQuantity ? (
                  <input
                    type="number"
                    min={1}
                    max={remainingStock}
                    autoFocus
                    value={selectedQuantity}
                    onChange={handleInputChange}
                    onBlur={() => setIsEditingQuantity(false)}
                    onKeyDown={handleInputKeyDown}
                    className="w-12 h-7 text-center font-bold text-white text-sm bg-neutral-950 border border-neutral-700 rounded-md focus:outline-none focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span
                    onDoubleClick={() => setIsEditingQuantity(true)}
                    title="Double click to edit quantity"
                    className="w-12 h-7 flex items-center justify-center text-center font-bold text-white text-sm select-none cursor-pointer hover:bg-neutral-800/60 rounded-md transition-colors"
                  >
                    {selectedQuantity}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={selectedQuantity >= remainingStock}
                  aria-label="Increase quantity"
                  className="w-8 h-10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 font-bold text-sm transition-colors cursor-pointer"
                >
                  &#43;
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600">
              {errorMessage}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesAdd}
              inputs={{
                lines,
                selectedVariant: selectedVariant
                  ? {
                      id: selectedVariant.id,
                      title: selectedVariant.title,
                      price: selectedVariant.price,
                      image: selectedVariant.image,
                      selectedOptions: selectedVariant.selectedOptions,
                      product: {
                        title: product.title,
                        handle: product.handle,
                      },
                    }
                  : null,
              }}
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
                      dispatch(openDrawer());
                    }}
                    className="w-full sm:w-auto min-w-42.5 py-3.5 px-8 text-sm font-bold bg-black text-white rounded-xl hover:bg-neutral-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                className="w-full sm:w-auto min-w-32.5 py-3.5 px-8 text-sm font-bold bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 active:scale-[0.99] transition-all cursor-pointer"
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
    featuredImage {
      id
      url
      altText
      width
      height
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
