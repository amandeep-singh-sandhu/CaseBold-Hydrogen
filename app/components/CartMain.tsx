import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {Button} from '~/components/Button';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};

function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

export function CartMain({layout, cart: originalCart}: CartMainProps) {
  const cart = useOptimisticCart(originalCart);
  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      className={`w-full ${layout === 'page' ? 'py-6' : 'p-4'}`}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      <CartEmpty hidden={linesCount} layout={layout} />

      {cartHasItems && (
        <div
          className={
            layout === 'page'
              ? 'grid grid-cols-1 lg:grid-cols-3 gap-12'
              : 'flex flex-col gap-6'
          }
        >
          <div className={layout === 'page' ? 'lg:col-span-2' : ''}>
            <ul
              aria-label="Cart items"
              className="divide-y divide-neutral-800 border-t border-b border-neutral-800"
            >
              {(cart?.lines?.nodes ?? []).map((line) => {
                if (
                  'parentRelationship' in line &&
                  line.parentRelationship?.parent
                ) {
                  return null;
                }
                return (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    layout={layout}
                    childrenMap={childrenMap}
                  />
                );
              })}
            </ul>
          </div>

          <div
            className={
              layout === 'page'
                ? 'lg:col-span-1'
                : 'border-t border-neutral-800 pt-4'
            }
          >
            <CartSummary cart={cart} layout={layout} />
          </div>
        </div>
      )}
    </section>
  );
}

function CartEmpty({
  hidden = false,
  layout,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const {close} = useAside();

  if (hidden) return null;

  return (
    <div className="text-center py-16 px-4">
      <h2 className="text-2xl font-bold text-black mb-2">Your Cart is Empty</h2>
      <p className="text-neutral-400 mb-6">
        Looks like you haven&rsquo;t added any phone cases to your cart yet.
      </p>
      <Link to="/products" onClick={close} prefetch="viewport">
        <Button
          variant="primary"
          className="bg-white text-black hover:bg-neutral-200 px-6 py-2.5"
        >
          Continue Shopping &rarr;
        </Button>
      </Link>
    </div>
  );
}
