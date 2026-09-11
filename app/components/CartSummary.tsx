import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {Button} from '~/components/Button';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  return (
    <div
      aria-labelledby={summaryId}
      className={`rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col gap-6 ${
        layout === 'page' ? 'sticky top-24' : ''
      }`}
    >
      <h2
        id={summaryId}
        className="text-lg font-bold text-white tracking-tight"
      >
        Order Summary
      </h2>

      {/* Subtotal & Totals */}
      <div className="flex flex-col gap-3 border-b border-neutral-800 pb-6 text-sm">
        <div className="flex justify-between text-neutral-200">
          <span>Subtotal</span>
          <span className="font-semibold text-white">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </span>
        </div>

        <div className="flex justify-between text-neutral-200">
          <span>Shipping</span>
          <span className="text-emerald-400 font-medium">
            Calculated at checkout
          </span>
        </div>

        <div className="flex justify-between text-neutral-200">
          <span>Taxes</span>
          <span className="text-emerald-400 font-medium">Calculated at checkout</span>
        </div>
      </div>

      {/* Discounts & Promos */}
      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />

      {/* Gift Cards */}
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
      />

      {/* Total Amount */}
      <div className="flex justify-between items-baseline border-t border-neutral-800 pt-4 text-white">
        <span className="text-base font-bold">Estimated Total</span>
        <span className="text-2xl font-black">
          {cart?.cost?.totalAmount?.amount ? (
            <Money data={cart?.cost?.totalAmount} />
          ) : (
            '-'
          )}
        </span>
      </div>

      {/* Checkout Button */}
      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
  if (!checkoutUrl) return null;

  return (
    <a href={checkoutUrl} target="_self" className="w-full">
      <Button
        variant="primary"
        className="w-full py-3.5 px-6 text-base font-bold text-black hover:bg-neutral-200 shadow-md transition-all active:scale-[0.99] text-center block"
      >
        Proceed to Checkout &rarr;
      </Button>
    </a>
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
    <section aria-label="Discounts" className="flex flex-col gap-3">
      {/* Active discount tags */}
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span
            id={discountsHeadingId}
            className="text-xs text-neutral-400 font-medium"
          >
            Applied:
          </span>
          {codes.map((code) => (
            <UpdateDiscountForm key={code}>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 text-xs text-emerald-400 border border-neutral-700">
                <code>{code}</code>
                <button
                  type="submit"
                  aria-label={`Remove discount code ${code}`}
                  className="text-neutral-400 hover:text-red-400 ml-1 transition-colors"
                >
                  &times;
                </button>
              </div>
            </UpdateDiscountForm>
          ))}
        </div>
      )}

      {/* Apply Discount Input */}
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
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
          />
          <Button
            type="submit"
            variant="secondary"
            className="text-xs px-4 py-2 border border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
          >
            Apply
          </Button>
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
      inputs={{
        discountCodes: discountCodes || [],
      }}
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
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (giftCardAddFetcher.data && giftCardCodeInput.current !== null) {
      giftCardCodeInput.current.value = '';
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <section aria-label="Gift cards" className="flex flex-col gap-3">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span
            id={giftCardHeadingId}
            className="text-xs text-neutral-400 font-medium"
          >
            Gift Cards:
          </span>
          {giftCardCodes.map((giftCard) => (
            <RemoveGiftCardForm
              key={giftCard.id}
              giftCardId={giftCard.id}
              lastCharacters={giftCard.lastCharacters}
              onRemoveClick={() => handleRemoveClick(giftCard.id)}
              buttonRef={(el: HTMLButtonElement | null) => {
                if (el) {
                  removeButtonRefs.current.set(giftCard.id, el);
                } else {
                  removeButtonRefs.current.delete(giftCard.id);
                }
              }}
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800 text-xs text-white border border-neutral-700">
                <code>***{giftCard.lastCharacters}</code>
                <span className="text-neutral-400">
                  (<Money data={giftCard.amountUsed} />)
                </span>
                <button
                  type="submit"
                  aria-label={`Remove gift card ending in ${giftCard.lastCharacters}`}
                  className="text-neutral-400 hover:text-red-400 ml-1 transition-colors"
                >
                  &times;
                </button>
              </div>
            </RemoveGiftCardForm>
          ))}
        </div>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
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
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={giftCardAddFetcher.state !== 'idle'}
            className="text-xs px-4 py-2 border border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Apply
          </Button>
        </div>
      </AddGiftCardForm>
    </section>
  );
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string;
  lastCharacters: string;
  children: React.ReactNode;
  onRemoveClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      {children}
      <button
        type="submit"
        aria-label={`Remove gift card ending in ${lastCharacters}`}
        onClick={onRemoveClick}
        ref={buttonRef}
        className="hidden"
      />
    </CartForm>
  );
}
