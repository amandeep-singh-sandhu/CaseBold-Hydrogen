import {useState, useEffect, useDeferredValue, useRef} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {DynamicBrandRule} from '~/root';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brandRules?: DynamicBrandRule[];
}

interface SearchResponse {
  products: any[];
  queries: {text: string}[];
}

export function SearchDrawer({
  isOpen,
  onClose,
  brandRules = [],
}: SearchDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredTerm = useDeferredValue(searchTerm);

  const [results, setResults] = useState<SearchResponse>({
    products: [],
    queries: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  {
    /* Derive the target brand or query to forward */
  }
  const targetQuery = searchTerm
    ? `?brand=${encodeURIComponent(searchTerm)}`
    : '';

  // Auto-focus input when activated
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setSearchTerm('');
      setResults({products: [], queries: []});
    }
  }, [isOpen]);

  // Query API when deferred term settles
  useEffect(() => {
    if (!deferredTerm.trim()) {
      setResults({products: [], queries: []});
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    setLoading(true);

    fetch(`/api/predictive-search?q=${encodeURIComponent(deferredTerm)}`)
      .then((res) => res.json() as Promise<SearchResponse>)
      .then((data) => {
        if (isSubscribed) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [deferredTerm]);

  if (!isOpen) return null;

  return (
    <div className="w-full bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800 text-white shadow-2xl transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Bar Container */}
        <div className="relative flex items-center w-full max-w-2xl mx-auto">
          <div className="absolute left-3 flex items-center pointer-events-none text-neutral-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by brand (Samsung, Apple), model, or style..."
            className="w-full h-12 bg-neutral-900 border border-neutral-800 rounded-full !pl-10 pr-14 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all shadow-inner"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white px-2 py-1 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Content Section */}
        <div className="mt-8">
          {/* Default State: Show Brand Chips from Metaobjects */}
          {!searchTerm && (
            <div className="text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">
                {brandRules.length > 0
                  ? 'Quick Device Search'
                  : 'Popular Searches'}
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {brandRules.length > 0
                  ? brandRules.map((rule) => (
                      <button
                        key={rule.brand}
                        type="button"
                        onClick={() => setSearchTerm(rule.brand)}
                        className="px-4 py-1.5 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-white hover:text-white transition-all"
                      >
                        {rule.brand}
                      </button>
                    ))
                  : ['Marble', 'Floral', 'MagSafe', 'Leopard'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchTerm(tag)}
                        className="px-4 py-1.5 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-white hover:text-white transition-all"
                      >
                        {tag}
                      </button>
                    ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && searchTerm && (
            <div className="py-12 text-center text-xs text-neutral-400">
              Searching catalog...
            </div>
          )}

          {/* Product Previews */}
          {!loading && results.products.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Matching Cases ({results.products.length})
                </span>
                {results.queries.length > 0 && (
                  <span className="text-xs text-neutral-400">
                    Showing models for {results.queries[0].text}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.products.map((prod) => (
                  <Link
                    key={prod.id}
                    to={`/products/${prod.handle}${targetQuery}`}
                    onClick={onClose}
                    className="group bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-600 rounded-xl p-3 flex flex-col transition-all hover:bg-neutral-900"
                  >
                    <div className="aspect-square bg-neutral-950 rounded-lg overflow-hidden mb-2.5 flex items-center justify-center">
                      {prod.featuredImage ? (
                        <Image
                          data={prod.featuredImage}
                          sizes="180px"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-neutral-500 text-xs">Case</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white truncate group-hover:underline">
                      {prod.title}
                    </p>
                    <div className="text-[11px] text-neutral-400 mt-1">
                      <Money data={prod.priceRange.minVariantPrice} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Zero-Results State */}
          {!loading && searchTerm && results.products.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-neutral-300">
                No cases found for &ldquo;{searchTerm}&rdquo;
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Try searching for brands like Apple, Samsung, or designs like
                Marble.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
