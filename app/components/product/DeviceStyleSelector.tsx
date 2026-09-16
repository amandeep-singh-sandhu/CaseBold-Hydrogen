import {Link, useNavigate, useLocation} from 'react-router';
import {useMemo} from 'react';
import {groupModelsByBrand} from '~/lib/brandUtils';

interface DeviceStyleSelectorProps {
  product: any;
  currentModel: string;
  allVariants: any[];
  relatedStyles: any[];
}

export function DeviceStyleSelector({
  product,
  currentModel,
  allVariants,
  relatedStyles,
}: DeviceStyleSelectorProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Model option names and model list
  const modelOption = product.options?.find(
    (o: any) =>
      o.name.toLowerCase() === 'model' || o.name.toLowerCase() === 'device',
  );
  const allModels: string[] = useMemo(
    () => modelOption?.optionValues?.map((v: any) => v.name) || [],
    [modelOption],
  );

  const {availableBrands, modelsByBrand} = useMemo(
    () => groupModelsByBrand(allModels),
    [allModels],
  );

  // Derive active brand
  const currentBrand = useMemo(() => {
    if (!currentModel) return availableBrands[0] || '';
    const entry = Object.entries(modelsByBrand).find(([_, models]) =>
      models.includes(currentModel),
    );
    return entry ? entry[0] : availableBrands[0] || '';
  }, [currentModel, modelsByBrand, availableBrands]);

  // Precompute variant inventory into an O(1) hash map: model -> isOutOfStock
  const modelStockMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const v of allVariants) {
      const modelVal = v.selectedOptions?.find(
        (opt: any) =>
          opt.name.toLowerCase() === 'model' ||
          opt.name.toLowerCase() === 'device',
      )?.value;

      if (modelVal) {
        const soldOut =
          !v.availableForSale ||
          (typeof v.quantityAvailable === 'number' && v.quantityAvailable <= 0);
        map.set(modelVal, soldOut);
      }
    }
    return map;
  }, [allVariants]);

  const activeBrandModels = modelsByBrand[currentBrand] || [];

  const updateParam = (key: string, value: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(key, value);
    navigate(`?${searchParams.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  };

  const handleBrandChange = (brand: string) => {
    const nextModels = modelsByBrand[brand] || [];
    if (nextModels.length > 0) {
      updateParam(modelOption?.name || 'Model', nextModels[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6 mb-8 p-5 bg-neutral-400/50 rounded-2xl border border-neutral-800">
      {/* Brand & Model Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-800 mb-2">
            1. Shop By Device Brand
          </label>
          <select
            value={currentBrand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
          >
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-800 mb-2">
            2. Select Model
          </label>
          <select
            value={currentModel}
            onChange={(e) =>
              updateParam(modelOption?.name || 'Model', e.target.value)
            }
            className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
          >
            {activeBrandModels.map((m) => {
              const isSoldOut = modelStockMap.get(m) ?? false;
              return (
                <option key={m} value={m}>
                  {m} {isSoldOut ? '(Sold Out)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Style Switcher */}
      {relatedStyles.length > 1 && (
        <div className="pt-2 border-t border-neutral-800">
          <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-800 mb-3">
            3. Select Style / Aesthetic
          </span>
          <div className="flex flex-wrap gap-2.5">
            {relatedStyles.map((styleItem) => {
              const targetParams = new URLSearchParams();
              if (currentModel) {
                targetParams.set('Model', currentModel);
              }

              return (
                <Link
                  key={styleItem.id}
                  prefetch="intent"
                  to={`/products/${styleItem.handle}?${targetParams.toString()}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    styleItem.isCurrent
                      ? 'border-white bg-white text-black shadow-sm'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600'
                  }`}
                >
                  {styleItem.image?.url && (
                    <img
                      src={styleItem.image.url}
                      alt={styleItem.title}
                      className="w-5 h-5 rounded-full object-cover border border-neutral-700"
                    />
                  )}
                  <span>{styleItem.title.replace(/Case/gi, '').trim()}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
