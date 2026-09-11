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

  let result;

  try {
    switch (action) {
      case CartForm.ACTIONS.LinesAdd:
        result = await cart.addLines(inputs.lines);
        break;
      case CartForm.ACTIONS.LinesUpdate:
        result = await cart.updateLines(inputs.lines);
        break;
      case CartForm.ACTIONS.LinesRemove:
        result = await cart.removeLines(inputs.lineIds);
        break;
      case CartForm.ACTIONS.DiscountCodesUpdate: {
        const formDiscountCode = inputs.discountCode;
        const discountCodes = (
          formDiscountCode ? [formDiscountCode] : ['']
        ) as string[];
        discountCodes.push(...inputs.discountCodes);
        result = await cart.updateDiscountCodes(discountCodes);
        break;
      }
      case CartForm.ACTIONS.GiftCardCodesAdd:
        result = await cart.addGiftCardCodes(inputs.giftCardCodes);
        break;
      case CartForm.ACTIONS.GiftCardCodesRemove:
        result = await cart.removeGiftCardCodes(inputs.giftCardCodes);
        break;
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

  // Collect all line IDs to remove all items at once
  const lineIds = cart?.lines?.nodes?.map((line: any) => line.id) || [];
  const hasItems = lineIds.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white min-h-[calc(100vh-160px)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
            Shopping Cart
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Review your selected cases before checkout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Empty Cart Button (Only shown when items exist) */}
          {/* Empty Cart Button */}
          {hasItems && (
            <CartForm
              route="/cart"
              action={CartForm.ACTIONS.LinesRemove}
              inputs={{lineIds}}
            >
              {(fetcher) => {
                const isClearing = fetcher.state !== 'idle';
                return (
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isClearing}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                  >
                    {isClearing ? 'Clearing...' : 'Empty Cart'}
                  </Button>
                );
              }}
            </CartForm>
          )}
          <Link to="/products" className="w-fit">
            <Button
              variant="secondary"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              <span>&larr;</span>
              <span>Continue Shopping</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Cart Items List & Summary */}
      <CartMain cart={cart} layout="page" />
    </main>
  );
}
