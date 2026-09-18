import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAppDispatch} from '~/store';
import {closeDrawer} from '~/store/drawerSlice';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const dispatch = useAppDispatch();
  const close = () => dispatch(closeDrawer());
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="py-6 flex flex-col gap-4">
      <div className="flex gap-4 sm:gap-6 items-start">
        {/* Product Variant Thumbnail */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shrink-0 flex items-center justify-center">
          {image ? (
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              loading="lazy"
              className="w-full h-full object-cover"
              sizes='96px'
            />
          ) : (
            <span className="text-xs text-neutral-600">No Image</span>
          )}
        </div>

        {/* Details & Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-4">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') close();
              }}
              className="text-base font-bold text-black hover:text-neutral-600 transition-colors truncate"
            >
              {product.title}
            </Link>
            <div className="text-base font-semibold text-white shrink-0">
              <ProductPrice price={line?.cost?.totalAmount} />
            </div>
          </div>

          {/* Selected Variant Options */}
          {/* Selected Variant Options */}
          <ul className="mt-1 space-y-0.5">
            {selectedOptions
              .filter(
                (option) =>
                  option.name !== 'Title' || option.value !== 'Default Title',
              )
              .map((option) => (
                <li key={option.name} className="text-xs text-neutral-400">
                  <span className="text-neutral-500">{option.name}:</span>{' '}
                  {option.value}
                </li>
              ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <CartLineQuantity line={line} />
          </div>
        </div>
      </div>

      {/* Child Line Items */}
      {lineItemChildren ? (
        <div className="pl-6 border-l border-neutral-800 ml-4">
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="space-y-4">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;

  const {id: lineId, quantity, isOptimistic, merchandise} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  // Inventory validation checks
  const isAvailable = Boolean(merchandise?.availableForSale);
  const rawQuantity = (merchandise as any)?.quantityAvailable;
  const isQuantityTracked = typeof rawQuantity === 'number';
  const maxStock = isQuantityTracked ? rawQuantity : Infinity;

  // Max cap reached
  const isMaxStockReached =
    !isAvailable || (isQuantityTracked && quantity >= maxStock);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-4">
        {/* Stepper */}
        <div className="flex items-center border border-neutral-800 rounded-lg bg-neutral-900 overflow-hidden">
          {/* If quantity is 1, decrementing submits a line removal */}
          {quantity === 1 ? (
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesRemove}
              inputs={{lineIds: [lineId]}}
            >
              <button
                type="submit"
                aria-label="Remove item"
                disabled={!!isOptimistic}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
              >
                &#8722;
              </button>
            </CartForm>
          ) : (
            <CartLineUpdateButton
              lines={[{id: lineId, quantity: prevQuantity}]}
            >
              <button
                type="submit"
                aria-label="Decrease quantity"
                disabled={!!isOptimistic}
                name="decrease-quantity"
                value={prevQuantity}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
              >
                &#8722;
              </button>
            </CartLineUpdateButton>
          )}

          <span className="w-9 text-center text-xs font-bold text-white">
            {quantity}
          </span>

          <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
            <button
              type="submit"
              aria-label="Increase quantity"
              name="increase-quantity"
              value={nextQuantity}
              disabled={!!isOptimistic || isMaxStockReached}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
            >
              &#43;
            </button>
          </CartLineUpdateButton>
        </div>

        {/* Remove Action */}
        <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
      </div>

      {/* Stock Cap Warning */}
      {isMaxStockReached && isQuantityTracked && (
        <span className="text-[11px] text-amber-500 font-medium">
          Max limit reached ({maxStock} in stock)
        </span>
      )}
    </div>
  );
}

function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        className="text-xs font-semibold text-neutral-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
      >
        Remove
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
