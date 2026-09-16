import {Await} from 'react-router';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {AdminMetaobjectNotice} from '~/components/AdminMetaobjectNotice';
import type {DynamicBrandRule} from '~/root';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
  brandRules?: DynamicBrandRule[];
  [key: string]: any;
}

export function PageLayout({
  cart,
  brandRules = [],
  children = null,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />

      {/* Visual reminder if no brand rules exist */}
      <AdminMetaobjectNotice rulesCount={brandRules.length} />

      {/* Custom CaseBold Header with dynamic Brand Rules */}
      <Header brandRules={brandRules} />

      {/* Main Page Content */}
      <main className="min-h-screen">{children}</main>

      {/* Custom CaseBold Footer */}
      <Footer />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense
        fallback={<p className="p-4 text-neutral-400">Loading cart ...</p>}
      >
        <Await resolve={cart}>
          {(cartData) => {
            return <CartMain cart={cartData} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}
