import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, Link} from 'react-router';
import {useAppDispatch} from '~/store';
import {closeDrawer} from '~/store/drawerSlice';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const dispatch = useAppDispatch();
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  // 1. DRAWER (ASIDE) VIEW: Minimal Subtotal + "View Cart Summary" Button
  if (layout === 'aside') {
    return (
      <div className="pt-4 border-t border-neutral-800 flex flex-col gap-4">
        <div className="flex justify-between items-center text-white">
          <span className="text-sm font-medium text-neutral-400">Subtotal</span>
          <span className="text-lg font-bold">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </span>
        </div>

        <Link
          to="/cart"
          onClick={() => dispatch(closeDrawer())}
          className="w-full"
        >
          <button className="w-full py-3 px-6 text-sm font-bold bg-white text-black hover:bg-neutral-200 active:scale-[0.99] transition-all text-center block rounded-xl cursor-pointer">
            View Cart Summary &rarr;
          </button>
        </Link>
      </div>
    );
  }

  // 2. PAGE VIEW (/cart): Styled Order Summary Card
  return (
    <div
      aria-labelledby={summaryId}
      className="rounded-2xl bg-neutral-600 text-white p-6 sm:p-7 flex flex-col gap-6 shadow-md"
    >
      <h2
        id={summaryId}
        className="text-xl font-bold text-white tracking-tight"
      >
        Order Summary
      </h2>

      {/* Subtotal & Totals */}
      <div className="flex flex-col gap-3 text-sm text-neutral-200">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-bold text-white">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="text-emerald-300 font-medium">
            Calculated at checkout
          </span>
        </div>

        <div className="flex justify-between">
          <span>Taxes</span>
          <span className="text-emerald-300 font-medium">
            Calculated at checkout
          </span>
        </div>
      </div>

      <hr className="border-neutral-500/60" />

      {/* Discount Code */}
      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />

      {/* Gift Card */}
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
      />

      <hr className="border-neutral-500/60" />

      {/* Estimated Total */}
      <div className="flex justify-between items-baseline text-white">
        <span className="text-base font-bold">Estimated Total</span>
        <span className="text-2xl sm:text-3xl font-black">
          {cart?.cost?.totalAmount?.amount ? (
            <Money data={cart?.cost?.totalAmount} />
          ) : (
            '-'
          )}
        </span>
      </div>

      {/* Checkout Button */}
      {cart?.checkoutUrl && (
        <a href={cart.checkoutUrl} target="_self" className="w-full">
          <button className="w-full py-3.5 px-6 text-sm font-bold bg-black text-white hover:bg-neutral-900 rounded-lg transition-all active:scale-[0.99] text-center block cursor-pointer">
            Proceed to Checkout &rarr;
          </button>
        </a>
      )}
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <section aria-label="Discounts" className="flex flex-col gap-2">
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span
            id={discountsHeadingId}
            className="text-xs text-neutral-300 font-medium"
          >
            Applied:
          </span>
          {codes.map((code) => (
            <UpdateDiscountForm key={code}>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 text-xs text-emerald-300 border border-neutral-700">
                <code>{code}</code>
                <button
                  type="submit"
                  aria-label={`Remove discount code ${code}`}
                  className="text-neutral-400 hover:text-red-400 ml-1 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </UpdateDiscountForm>
          ))}
        </div>
      )}

      <UpdateDiscountForm discountCodes={codes}>
        <div className="flex gap-2">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Discount code
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Discount code"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
          />
          <button
            type="submit"
            className="text-xs font-semibold px-4 py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{discountCodes: discountCodes || []}}
    >
      {children}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
  giftCardHeadingId: string;
  giftCardInputId: string;
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});

  useEffect(() => {
    if (giftCardAddFetcher.data && giftCardCodeInput.current !== null) {
      giftCardCodeInput.current.value = '';
    }
  }, [giftCardAddFetcher.data]);

  return (
    <section aria-label="Gift cards" className="flex flex-col gap-2">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span
            id={giftCardHeadingId}
            className="text-xs text-neutral-300 font-medium"
          >
            Gift Cards:
          </span>
          {giftCardCodes.map((giftCard) => (
            <RemoveGiftCardForm key={giftCard.id} giftCardId={giftCard.id}>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 text-xs text-white border border-neutral-700">
                <code>***{giftCard.lastCharacters}</code>
                <button
                  type="submit"
                  aria-label={`Remove gift card ending in ${giftCard.lastCharacters}`}
                  className="text-neutral-400 hover:text-red-400 ml-1 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </RemoveGiftCardForm>
          ))}
        </div>
      )}

      <CartForm
        fetcherKey="gift-card-add"
        route="/cart"
        action={CartForm.ACTIONS.GiftCardCodesAdd}
      >
        <div className="flex gap-2">
          <label htmlFor={giftCardInputId} className="sr-only">
            Gift card code
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            ref={giftCardCodeInput}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
          />
          <button
            type="submit"
            disabled={giftCardAddFetcher.state !== 'idle'}
            className="text-xs font-semibold px-4 py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Apply
          </button>
        </div>
      </CartForm>
    </section>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  children,
}: {
  giftCardId: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{giftCardCodes: [giftCardId]}}
    >
      {children}
    </CartForm>
  );
}
