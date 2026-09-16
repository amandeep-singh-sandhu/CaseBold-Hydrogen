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
  Money,
  Image,
} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {Button} from '~/components/Button';
import {BRAND_RULES_QUERY} from '~/lib/fragments';
import {
  getBrandFromModel,
  groupModelsByBrand,
  type DynamicBrandRule,
} from '~/lib/brandUtils';
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

  // Fetch product data and dynamic brand rules in parallel
  const [{product}, brandRulesData] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions: getSelectedProductOptions(request),
      },
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

  // Parse Metaobjects created by the client
  const rawNodes = (brandRulesData?.metaobjects?.nodes ?? []) as Array<{
    brandName?: {value?: string} | null;
    matches?: {value?: string} | null;
    priority?: {value?: string} | null;
  }>;

  const brandRules: DynamicBrandRule[] = rawNodes
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

  return {product, brandRules};
}

export default function Product() {
  const {product, brandRules} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const navigate = useNavigate();
  const location = useLocation();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedCart, setResolvedCart] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const [isEditingQuantity, setIsEditingQuantity] = useState(false);

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

  // Inverted catalog: Device string is the Model option
  const currentModel =
    selectedVariant?.selectedOptions?.find(
      (opt: any) =>
        opt.name.toLowerCase() === 'model' ||
        opt.name.toLowerCase() === 'device',
    )?.value || '';

  // Extract all model values present in product variants
  const allModels: string[] = useMemo(() => {
    const modelOption = product.options?.find(
      (o: any) =>
        o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
    );
    return modelOption?.optionValues?.map((v: any) => v.name) || [];
  }, [product.options]);

  // Group models belonging to this artwork using dynamic metaobject rules
  const {availableBrands, modelsByBrand} = useMemo(() => {
    return groupModelsByBrand(allModels, brandRules);
  }, [allModels, brandRules]);

  // Active Brand calculation based on currently selected model
  const currentBrand = useMemo(() => {
    if (!currentModel) return availableBrands[0] || '';
    const brand = getBrandFromModel(currentModel, brandRules);
    return availableBrands.includes(brand) ? brand : availableBrands[0] || '';
  }, [currentModel, availableBrands, brandRules]);

  // Models available under current active brand
  const activeBrandModels = useMemo(() => {
    return modelsByBrand[currentBrand] || [];
  }, [modelsByBrand, currentBrand]);

  // Precompute variant inventory map for O(1) checks
  const modelStockMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const v of allVariants) {
      const modelVal = v.selectedOptions?.find(
        (opt: any) =>
          opt.name.toLowerCase() === 'model' ||
          opt.name.toLowerCase() === 'device',
      )?.value;

      if (modelVal) {
        const soldOut =
          !v.availableForSale ||
          (typeof v.quantityAvailable === 'number' && v.quantityAvailable <= 0);
        map.set(modelVal, soldOut);
      }
    }
    return map;
  }, [allVariants]);

  // Related styles from Metafield + current product
  const relatedStyles = useMemo(() => {
    const currentStyleItem = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage,
      isCurrent: true,
    };

    const companionItems =
      product.relatedStyles?.references?.nodes?.map((ref: any) => ({
        id: ref.id,
        handle: ref.handle,
        title: ref.title,
        image: ref.featuredImage,
        isCurrent: false,
      })) || [];

    return [currentStyleItem, ...companionItems];
  }, [product]);

  // Inventory & Stock Calculations
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

  const updateParam = (key: string, value: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(key, value);
    navigate(`?${searchParams.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  };

  const handleBrandChange = (brand: string) => {
    const nextModels = modelsByBrand[brand] || [];
    if (nextModels.length > 0) {
      const modelOptionName =
        product.options?.find(
          (o: any) =>
            o.name.toLowerCase() === 'model' ||
            o.name.toLowerCase() === 'device',
        )?.name || 'Model';
      updateParam(modelOptionName, nextModels[0]);
    }
  };

  const handleModelChange = (model: string) => {
    const modelOptionName =
      product.options?.find(
        (o: any) =>
          o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
      )?.name || 'Model';
    updateParam(modelOptionName, model);
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

  const lines =
    selectedVariant?.id && selectedQuantity > 0
      ? [
          {
            merchandiseId: selectedVariant.id,
            quantity: selectedQuantity,
          },
        ]
      : [];
      
  // Auto-select brand/model if navigated from search with ?brand=...
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawSearchParam =
      searchParams.get('search') ||
      searchParams.get('brand') ||
      searchParams.get('model');

    if (!rawSearchParam || availableBrands.length === 0) return;

    const term = rawSearchParam.toLowerCase().trim();

    // Find the exact option name used in Shopify ('Model' or 'Device')
    const modelOptionName =
      product.options?.find(
        (o: any) =>
          o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
      )?.name || 'Model';

    // 1. Direct Model Check: Check if the search term matches any available model directly
    let targetModel: string | undefined;
    let targetBrand: string | undefined;

    for (const brand of availableBrands) {
      const models = modelsByBrand[brand] || [];
      const matched = models.find((m) => {
        const lowerM = m.toLowerCase();
        return (
          lowerM === term || lowerM.includes(term) || term.includes(lowerM)
        );
      });

      if (matched) {
        targetModel = matched;
        targetBrand = brand;
        break;
      }
    }

    // 2. Brand Fallback: If no specific model matched, check if it was a brand name
    if (!targetModel) {
      targetBrand = availableBrands.find(
        (b) => b.toLowerCase() === term || term.includes(b.toLowerCase()),
      );

      if (!targetBrand) {
        const derived = getBrandFromModel(term, brandRules);
        if (derived !== 'Other' && availableBrands.includes(derived)) {
          targetBrand = derived;
        }
      }

      if (targetBrand) {
        const brandModels = modelsByBrand[targetBrand] || [];
        targetModel = brandModels[0];
      }
    }

    // 3. Apply the selection to URL if found and different from current selection
    if (targetModel && targetModel !== currentModel) {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('search');
      nextParams.delete('brand');
      nextParams.delete('model');
      nextParams.set(modelOptionName, targetModel);

      navigate(`?${nextParams.toString()}`, {
        preventScrollReset: true,
        replace: true,
      });
    }
  }, [
    location.search,
    availableBrands,
    modelsByBrand,
    brandRules,
    currentModel,
    navigate,
    product.options,
  ]);
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
        {/* Gallery Image */}
        <div className="aspect-square bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm flex items-center justify-center overflow-hidden">
          {selectedVariant?.image?.url ? (
            <Image
              data={selectedVariant.image}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-full object-cover object-center"
            />
          ) : product.featuredImage?.url ? (
            <Image
              data={product.featuredImage}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <span className="text-neutral-500 text-sm">No Image</span>
          )}
        </div>

        {/* Product Configurator */}
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

          <div className="text-2xl font-bold text-black flex items-center mb-2">
            <h1 className="text-3xl font-extrabold text-black tracking-tight !m-0">
              {product.title}
            </h1>
            <span className="ml-2 mr-2">&#8722;</span>
            <Money data={selectedVariant?.price} />
          </div>
          <p className="text-base text-neutral-400 leading-relaxed">
            {product.description}
          </p>

          {/* <div className="text-2xl font-bold text-black mb-6">
            <Money data={selectedVariant?.price} />
          </div> */}

          {/* Configurator Card */}
          <div className="flex flex-col gap-6 mt-2 p-5 pl-0 rounded-2xl">
            {/* Step 1 & 2: Brand and Device Dropdowns */}
            <form
              onSubmit={(e) => e.preventDefault()}
              aria-label="Device Configuration"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-1">
                {/* Step 1: Device Brand */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="device-brand-select"
                    className="text-sm font-bold uppercase text-neutral-400 flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-mono border border-neutral-700">
                      1
                    </span>
                    Shop By Device Brand
                  </label>
                  <select
                    id="device-brand-select"
                    name="deviceBrand"
                    value={currentBrand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-white rounded-xl pl-4 pr-12 py-3 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    {availableBrands.map((b) => (
                      <option
                        key={b}
                        value={b}
                        className="bg-neutral-950 text-white"
                      >
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Device Model */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="device-model-select"
                    className="text-sm font-bold uppercase text-neutral-400 flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-mono border border-neutral-700">
                      2
                    </span>
                    Select Model
                  </label>

                  <select
                    id="device-model-select"
                    name="deviceModel"
                    value={currentModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="lg:min-w-[250px] w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-white rounded-xl pl-4 pr-12 py-3 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    {activeBrandModels.map((m) => {
                      const isSoldOut = modelStockMap.get(m) ?? false;
                      return (
                        <option
                          key={m}
                          value={m}
                          className="bg-neutral-950 text-white"
                        >
                          {m} {isSoldOut ? '(Sold Out)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </form>

            {/* Step 3: Style Switcher Swatches */}
            {relatedStyles.length > 1 && (
              <div className="pt-2 border-t border-neutral-800">
                <span className="block text-sm font-semibold uppercase text-neutral-400 mb-3">
                  3. Select Style / Aesthetic
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {relatedStyles.map((styleItem) => {
                    const targetParams = new URLSearchParams();
                    if (currentModel) {
                      targetParams.set('Model', currentModel);
                    }

                    return (
                      <Link
                        key={styleItem.id}
                        prefetch="intent"
                        to={`/products/${styleItem.handle}?${targetParams.toString()}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          styleItem.isCurrent
                            ? 'border-white bg-white text-black shadow-sm'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600'
                        }`}
                      >
                        {styleItem.image?.url && (
                          <img
                            src={styleItem.image.url}
                            alt={styleItem.title}
                            className="w-5 h-5 rounded-full object-cover border border-neutral-700"
                          />
                        )}
                        <span>
                          {styleItem.title.replace(/Case/gi, '').trim()}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Controls */}
          {!isOutOfStock && (
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <label className="text-sm font-bold uppercase text-neutral-400">
                  Quantity
                </label>
                <span className="text-xs font-semibold text-neutral-400">
                  (Max: {remainingStock})
                </span>
              </div>

              <div className="flex items-center border border-neutral-800 rounded-xl w-fit bg-neutral-900/90 p-1 shadow-sm">
                {/* Decrease Button */}
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={selectedQuantity <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:text-white hover:bg-neutral-800 active:bg-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all text-base font-semibold"
                >
                  &#8722;
                </button>

                {/* Double-Click Editable Quantity Box */}
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
                    className="w-14 h-6 text-center font-bold text-white text-sm bg-neutral-950 border border-neutral-700 rounded-md focus:outline-none focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span
                    onDoubleClick={() => setIsEditingQuantity(true)}
                    title="Double click to edit quantity"
                    className="w-14 h-9 flex items-center justify-center text-center font-bold text-white text-sm select-none cursor-pointer hover:bg-neutral-800/60 rounded-md transition-colors"
                  >
                    {selectedQuantity}
                  </span>
                )}

                {/* Increase Button */}
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={selectedQuantity >= remainingStock}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:text-white hover:bg-neutral-800 active:bg-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all text-base font-semibold"
                >
                  &#43;
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-800 text-xs font-medium text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Cart Actions */}
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
                    className="w-full sm:w-auto py-3 px-8 text-base bg-black text-white font-bold shadow-sm hover:bg-gray-200 active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full py-3 px-8 text-base bg-neutral-700 hover:bg-neutral-900 text-white"
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
