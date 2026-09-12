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

  // Resolve cart promise safely across React 18/19
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

  // Brand categorization helper
  const getBrandFromModel = (model: string): string => {
    const m = model.toLowerCase();
    if (m.includes('iphone') || m.includes('apple')) return 'Apple';
    if (m.includes('galaxy') || m.includes('samsung')) return 'Samsung';
    if (m.includes('pixel') || m.includes('google')) return 'Google';
    return 'Other';
  };

  // Group models belonging to this specific artwork by their brand
  const {availableBrands, modelsByBrand} = useMemo(() => {
    const brandMap: Record<string, string[]> = {};
    const modelOption = product.options?.find(
      (o: any) =>
        o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
    );
    const models: string[] =
      modelOption?.optionValues?.map((v: any) => v.name) || [];

    models.forEach((m) => {
      const brand = getBrandFromModel(m);
      if (!brandMap[brand]) brandMap[brand] = [];
      brandMap[brand].push(m);
    });

    return {
      availableBrands: Object.keys(brandMap),
      modelsByBrand: brandMap,
    };
  }, [product.options]);

  // Active Brand calculation based on currently selected model
  const currentBrand = useMemo(() => {
    if (!currentModel) return availableBrands[0] || '';
    const brand = getBrandFromModel(currentModel);
    return availableBrands.includes(brand) ? brand : availableBrands[0] || '';
  }, [currentModel, availableBrands]);

  // Models available under current brand
  const activeBrandModels = useMemo(() => {
    return modelsByBrand[currentBrand] || [];
  }, [modelsByBrand, currentBrand]);

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
        {/* Gallery Image */}
        <div className="aspect-square bg-gray-100 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
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
            <span className="text-gray-400 text-sm">No Image</span>
          )}
        </div>

        {/* Product Configurator */}
        <div className="flex flex-col">
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

          {/* Configurator Card */}
          <div className="flex flex-col gap-6 mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-200">
            {/* Step 1 & 2: Brand and Device Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  1. Shop By Device Brand
                </label>
                <select
                  value={currentBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
                >
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  2. Select Model
                </label>
                <select
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
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
              </div>
            </div>

            {/* Step 3: Style Switcher Swatches */}
            {relatedStyles.length > 1 && (
              <div className="pt-2 border-t border-gray-200">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  3. Select Style / Aesthetic
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {relatedStyles.map((styleItem) => {
                    // Carry over current device selection across styles
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
                            ? 'border-black bg-black text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
                        }`}
                      >
                        {styleItem.image?.url && (
                          <img
                            src={styleItem.image.url}
                            alt={styleItem.title}
                            className="w-5 h-5 rounded-full object-cover border border-gray-300"
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

          <p className="text-base text-gray-600 leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Quantity Controls */}
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
                  readOnly
                  className="w-14 h-10 text-center font-bold text-gray-900 focus:outline-none text-sm"
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

          {errorMessage && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-600">
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
    variants(first: 50) {
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
