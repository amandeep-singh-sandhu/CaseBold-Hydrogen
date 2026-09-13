interface QuantityStepperProps {
  quantity: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

export function QuantityStepper({
  quantity,
  max,
  onDecrease,
  onIncrease,
}: QuantityStepperProps) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        Quantity (Max: {max})
      </label>
      <div className="flex items-center border border-neutral-800 rounded-lg w-fit bg-neutral-950 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={onDecrease}
          disabled={quantity <= 1}
          className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold"
        >
          &#8722;
        </button>
        <span className="w-14 h-10 flex items-center justify-center font-bold text-white text-sm">
          {quantity}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={quantity >= max}
          className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold"
        >
          &#43;
        </button>
      </div>
    </div>
  );
}
