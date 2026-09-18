import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY, BRAND_RULES_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';

// Redux Integration
import { Provider } from 'react-redux';
import { store } from '~/store';

// Ensure store is attached to window on the client for testing:
if (typeof window !== 'undefined') {
  (window as any).__REDUX_STORE__ = store;
}

export type RootLoader = typeof loader;

export interface DynamicBrandRule {
  brand: string;
  matches: string[];
  priority: number;
}

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  return false;
};

export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await critical data (Header + Dynamic Brand Metaobjects)
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN || env.PUBLIC_STORE_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold.
 */
async function loadCriticalData({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const [header, brandRulesData] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    }),
    storefront.query(BRAND_RULES_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        first: 25,
      },
    }),
  ]);

  // Safely parse Metaobjects created by the client
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
    .sort(
      (a: DynamicBrandRule, b: DynamicBrandRule) => a.priority - b.priority,
    );

  return {header, brandRules};
}

/**
 * Load data for rendering content below the fold.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  const {storefront, customerAccount, cart} = context;

  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer',
      },
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss} />
        <link rel="stylesheet" href={resetStyles} />
        <link rel="stylesheet" href={appStyles} />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <Provider store={store}>
      <Analytics.Provider
        cart={data.cart}
        shop={data.shop}
        consent={data.consent}
      >
        <PageLayout {...data}>
          <Outlet />
        </PageLayout>
      </Analytics.Provider>
    </Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error p-8 text-white bg-neutral-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Oops</h1>
      <h2 className="text-xl text-neutral-400 mb-4">{errorStatus}</h2>
      {errorMessage && (
        <fieldset className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/50">
          <pre className="text-sm text-red-400 overflow-x-auto">
            {errorMessage}
          </pre>
        </fieldset>
      )}
    </div>
  );
}
