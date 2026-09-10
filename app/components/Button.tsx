import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	variant?: "primary" | "secondary";
}

export function Button({
	children,
	variant = "primary",
	className = "",
	...props
}: ButtonProps) {
	const baseStyles =
		"px-4 py-2 rounded font-medium transition-colors cursor-pointer";
	const variants = {
		primary: "bg-black text-white hover:bg-neutral-800",
		secondary: "bg-neutral-200 text-black hover:bg-neutral-300",
	};

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}
