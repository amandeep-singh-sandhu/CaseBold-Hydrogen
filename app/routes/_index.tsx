import { Await, useLoaderData, Link } from 'react-router';
import type { Route } from './+types/_index';
import { Suspense } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import type { RecommendedProductsQuery } from 'storefrontapi.generated';
import { Button } from '~/components/Button';

export const meta: Route.MetaFunction = () => {
	return [
		{ title: "CaseBold | Engineered Protection Phone Cases" },
		{
			description:
				"Drop-tested, military-grade protective cases for modern phones.",
		},
	];
};

export async function loader(args: Route.LoaderArgs) {
	const deferredData = loadDeferredData(args);
	const criticalData = await loadCriticalData(args);

	return { ...deferredData, ...criticalData };
}

async function loadCriticalData({ context }: Route.LoaderArgs) {
	return {
		isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
	};
}

function loadDeferredData({ context }: Route.LoaderArgs) {
	const recommendedProducts = context.storefront
		.query(RECOMMENDED_PRODUCTS_QUERY)
		.catch((error: Error) => {
			console.error(error);
			return null;
		});

	return {
		recommendedProducts,
	};
}

export default function Homepage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="flex flex-col gap-16 pb-16 bg-neutral-950 text-white min-h-screen">
			{/* Hero Section */}
			<section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-neutral-800">
				<div className="max-w-7xl mx-auto relative z-10">
					<div className="max-w-2xl">
						<span className="inline-block bg-white/10 text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-white/20">
							Engineered Protection
						</span>
						<h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
							Style meets relentless durability.
						</h1>
						<p className="text-lg sm:text-xl text-neutral-400 mb-8 leading-relaxed">
							Explore 10ft drop-tested designer phone cases crafted with
							military-grade shock absorption and precision MagSafe alignment.
						</p>
						<div className="flex flex-wrap gap-4">
							<Link to="/collections">
								<Button
									variant="secondary"
									className="px-8 py-3 text-base font-bold bg-white text-black hover:bg-neutral-200"
								>
									Shop All Cases
								</Button>
							</Link>
							<Link to="/products/midnight-marble">
								<Button
									variant="primary"
									className="border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 px-8 py-3 text-base"
								>
									View Bestseller
								</Button>
							</Link>
						</div>
					</div>
				</div>

				{/* Ambient Glow */}
				<div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
			</section>

			{/* Trust Badges */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-y border-neutral-800 py-8 text-center md:text-left">
					<div className="px-4">
						<h4 className="font-bold text-white mb-1">10ft Drop Certified</h4>
						<p className="text-sm text-neutral-400">
							Multi-layer polycarbonate guards against daily drops.
						</p>
					</div>
					<div className="px-4 md:border-l border-neutral-800">
						<h4 className="font-bold text-white mb-1">MagSafe Compatible</h4>
						<p className="text-sm text-neutral-400">
							Embedded neodymium magnets for snap-on wireless charging.
						</p>
					</div>
					<div className="px-4 md:border-l border-neutral-800">
						<h4 className="font-bold text-white mb-1">Lifetime Warranty</h4>
						<p className="text-sm text-neutral-400">
							Guaranteed protection against discoloration and defects.
						</p>
					</div>
				</div>
			</section>

			{/* Live Featured Cases Grid */}
			<FeaturedProductsSection products={data.recommendedProducts} />
		</div>
	);
}

function FeaturedProductsSection({
	products,
}: {
	products: Promise<RecommendedProductsQuery | null>;
}) {
	return (
		<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
			<div className="flex justify-between items-end mb-8">
				<div>
					<h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
						Featured Cases
					</h2>
					<p className="text-sm text-neutral-400 mt-1">
						Live from your CaseBold store catalog.
					</p>
				</div>
				<Link
					to="/cases"
					className="text-sm font-semibold text-neutral-300 hover:text-white underline underline-offset-4"
				>
					View all cases &rarr;
				</Link>
			</div>

			<Suspense
				fallback={
					<div className="text-neutral-500 py-12 text-center">
						Loading cases...
					</div>
				}
			>
				<Await resolve={products}>
					{(response) => {
						const productNodes = response?.products?.nodes || [];
						if (productNodes.length === 0) {
							return (
								<div className="text-neutral-500 py-8">No products found.</div>
							);
						}

						return (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
								{productNodes.map((product) => (
									<div
										key={product.id}
										className="group border border-neutral-800 rounded-2xl p-4 flex flex-col hover:border-neutral-700 bg-neutral-900/50 transition-colors"
									>
										<div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-4 border border-neutral-800 flex items-center justify-center">
											{product.featuredImage ? (
												<Image
													data={product.featuredImage}
													sizes="(min-width: 1024px) 25vw, 50vw"
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											) : (
												<div className="text-neutral-600 text-xs uppercase tracking-wider">
													No Image
												</div>
											)}
										</div>

										<h3 className="font-bold text-lg text-white truncate mb-1">
											{product.title}
										</h3>

										<div className="text-neutral-400 text-sm mb-4">
											<Money data={product.priceRange.minVariantPrice} />
										</div>

										<Link
											to={`/products/${product.handle}`}
											className="mt-auto text-center bg-white text-black py-2.5 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
										>
											View Case
										</Link>
									</div>
								))}
							</div>
						);
					}}
				</Await>
			</Suspense>
		</section>
	);
}

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
