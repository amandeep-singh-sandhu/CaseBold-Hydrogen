import {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '~/store';
import {closeDrawer} from '~/store/drawerSlice';
import {CartMain} from '~/components/CartMain';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

interface CartDrawerProps {
  cart: CartApiQueryFragment | null;
}

export function CartDrawer({cart}: CartDrawerProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.drawer.isOpen);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        dispatch(closeDrawer());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dispatch]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      aria-modal="true"
      role="dialog"
    >
      {/* Dimmed Backdrop Overlay (z-40) */}
      <div
        onClick={() => dispatch(closeDrawer())}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-over Drawer Panel (z-50) */}
      <div
        style={{
          transform: isOpen ? 'translateX(0%)' : 'translateX(100%)',
        }}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-neutral-950 text-white shadow-2xl border-l border-neutral-800 transition-transform duration-300 ease-out will-change-transform"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Your Cart</span>
            {Boolean(cart?.totalQuantity) && (
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">
                {cart?.totalQuantity}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => dispatch(closeDrawer())}
            aria-label="Close cart drawer"
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Cart Content Area */}
        <div
          className={`flex-1 px-6 py-4 ${
            (cart?.totalQuantity ?? 0) === 0
              ? 'h-screen flex items-center'
              : 'overflow-y-auto'
          }`}
        >
          <CartMain cart={cart} layout="aside" />
        </div>
      </div>
    </div>
  );
}
