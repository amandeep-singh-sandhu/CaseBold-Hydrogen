import {useState} from 'react';
import {Link} from 'react-router';
import {SearchDrawer} from './SearchDrawer';
import type {DynamicBrandRule} from '~/root';

interface HeaderProps {
  brandRules?: DynamicBrandRule[];
}

export function Header({brandRules = []}: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 w-full">
      <header className="border-b border-neutral-800 bg-neutral-950 backdrop-blur-md px-6 py-4 flex items-center justify-between text-white">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center no-underline!">
          <span className="text-xl font-black tracking-tight text-white">
            CASEBOLD
          </span>
        </Link>

        {/* Navigation & Action Icons */}
        <div className="flex items-center gap-6">
          <nav className="hidden sm:flex gap-6 items-center text-sm font-medium">
            <Link
              to="/"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/products"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Products
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Cart Link */}
            <Link
              to="/cart"
              className="text-neutral-400 hover:text-white transition-colors text-sm font-medium"
            >
              Cart
            </Link>
            {/* Search Icon Trigger */}
            <button
              type="button"
              aria-label="Toggle Search"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 text-sm font-medium rounded-lg transition-colors flex gap-1 items-center"
            >
              <span>Search</span>
              {isSearchOpen ? (
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
              ) : (
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Activated Search Bar Underneath Header */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        brandRules={brandRules}
      />
    </div>
  );
}
