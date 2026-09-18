import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';
import {useLoaderData, Link} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {Button} from '~/components/Button';

export const meta = () => {
  return [
    {title: 'Shopping Cart | CaseBold'},
    {description: 'Review your selected items and proceed to checkout.'},
  ];
};

export async function action({request, context}: ActionFunctionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  let result: any;

  try {
    switch (action) {
      case CartForm.ACTIONS.LinesAdd: {
        const rawLines = Array.isArray(inputs.lines)
          ? inputs.lines
          : [inputs.lines];
        const cleanLines = rawLines.filter(Boolean).map((line: any) => ({
          merchandiseId: line.merchandiseId,
          quantity: Number(line.quantity || 1),
          attributes: line.attributes,
        }));
        result = await cart.addLines(cleanLines);
        break;
      }
      case CartForm.ACTIONS.LinesUpdate: {
        const rawLines = Array.isArray(inputs.lines)
          ? inputs.lines
          : [inputs.lines];
        const cleanLines = rawLines.filter(Boolean).map((line: any) => ({
          id: line.id,
          quantity: Number(line.quantity),
          attributes: line.attributes,
        }));
        result = await cart.updateLines(cleanLines);
        break;
      }
      case CartForm.ACTIONS.LinesRemove: {
        const lineIds = Array.isArray(inputs.lineIds)
          ? inputs.lineIds
          : [inputs.lineIds].filter(Boolean);
        result = await cart.removeLines(lineIds);
        break;
      }
      case CartForm.ACTIONS.DiscountCodesUpdate: {
        const formDiscountCode = inputs.discountCode;
        const discountCodes = (
          formDiscountCode ? [formDiscountCode] : []
        ) as string[];
        discountCodes.push(...inputs.discountCodes);
        result = await cart.updateDiscountCodes(discountCodes);
        break;
      }
      case CartForm.ACTIONS.GiftCardCodesAdd: {
        const formGiftCardCode = inputs.giftCardCode;
        const giftCardCodes = (
          formGiftCardCode ? [formGiftCardCode] : []
        ) as string[];
        result = await cart.addGiftCardCodes(giftCardCodes);
        break;
      }
      case CartForm.ACTIONS.GiftCardCodesRemove: {
        const appliedGiftCardIds = inputs.giftCardCodes as string[];
        result = await cart.removeGiftCardCodes(appliedGiftCardIds);
        break;
      }
      default:
        throw new Response(`Unhandled action: ${action}`, {status: 400});
    }
  } catch (error: any) {
    return Response.json({error: error.message}, {status: 400});
  }

  const headers = cart.setCartId(result.cart.id);
  return Response.json(result, {status: 200, headers});
}

export async function loader({context}: LoaderFunctionArgs) {
  const {cart} = context;
  return {cart: await cart.get()};
}

export default function CartRoute() {
  const {cart} = useLoaderData<typeof loader>();

  const lineIds = cart?.lines?.nodes?.map((line: any) => line.id) || [];
  const hasItems = lineIds.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-160px)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black">
            Shopping Cart
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Review your selected cases before checkout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasItems && (
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesRemove}
              inputs={{lineIds}}
            >
              {(fetcher) => {
                const isClearing = fetcher.state !== 'idle';
                return (
                  <button
                    type="submit"
                    disabled={isClearing}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors rounded cursor-pointer"
                  >
                    {isClearing ? 'Clearing...' : 'Empty Cart'}
                  </button>
                );
              }}
            </CartForm>
          )}

          <Link to="/products" className="w-fit">
            <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-neutral-800 transition-colors rounded cursor-pointer">
              <span>&larr;</span>
              <span>Continue Shopping</span>
            </button>
          </Link>
        </div>
      </div>

      <hr className="border-neutral-300 mb-8" />
      <CartMain cart={cart} layout="page" />
    </main>
  );
}
