interface PriceProps {
	amount: number;
	currency?: string;
	className?: string;
}

export function Price({
	amount,
	currency = "USD",
	className = "",
}: PriceProps) {
	const formatted = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);

	return <span className={`font-semibold ${className}`}>{formatted}</span>;
}
