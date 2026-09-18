import {Await} from 'react-router';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {AdminMetaobjectNotice} from '~/components/AdminMetaobjectNotice';
import {CartDrawer} from '~/components/CartDrawer';
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
    <>
      {/* Redux Slide-Over Cart Drawer */}
      <Suspense fallback={null}>
        <Await resolve={cart}>
          {(cartData) => <CartDrawer cart={cartData} />}
        </Await>
      </Suspense>

      {/* Visual reminder if no brand rules exist */}
      <AdminMetaobjectNotice rulesCount={brandRules.length} />

      {/* Custom CaseBold Header with dynamic Brand Rules */}
      <Header brandRules={brandRules} />

      {/* Main Page Content */}
      <main className="min-h-screen">{children}</main>

      {/* Custom CaseBold Footer */}
      <Footer />
    </>
  );
}
