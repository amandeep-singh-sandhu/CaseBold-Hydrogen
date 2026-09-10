interface LogoProps {
	className?: string;
	variant?: "light" | "dark";
}

export function Logo({
	className = "h-8 w-auto",
	variant = "light",
}: LogoProps) {
	const textColor = variant === "light" ? "#ffffff" : "#111827";

	return (
		<div className={`inline-flex items-center select-none ${className}`}>
			<svg
				viewBox="0 0 240 50"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="w-full h-full overflow-visible"
				aria-label="CaseBold Logo"
				role="img"
			>
				<defs>
					<filter id="rgb-glitch" x="-20%" y="-20%" width="140%" height="140%">
						{/* Red offset to the right */}
						<feOffset in="SourceGraphic" dx="2" dy="0" result="red-layer" />
						{/* Cyan/Blue offset to the left */}
						<feOffset in="SourceGraphic" dx="-2" dy="0" result="cyan-layer" />
					</filter>
				</defs>

				{/* Cyan / Blue Chromatic Shadow Layer */}
				<text
					x="12"
					y="37"
					fill="#00e5ff"
					fontSize="36"
					fontWeight="900"
					fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
					letterSpacing="-0.5px"
					opacity="0.9"
				>
					CaseBold
				</text>

				{/* Orange / Red Chromatic Shadow Layer */}
				<text
					x="16"
					y="37"
					fill="#ff3b30"
					fontSize="36"
					fontWeight="900"
					fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
					letterSpacing="-0.5px"
					opacity="0.9"
				>
					CaseBold
				</text>

				{/* Foreground Primary Text */}
				<text
					x="14"
					y="37"
					fill={textColor}
					fontSize="36"
					fontWeight="900"
					fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
					letterSpacing="-0.5px"
				>
					CaseBold
				</text>
			</svg>
		</div>
	);
}
