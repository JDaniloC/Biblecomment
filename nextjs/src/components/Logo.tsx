interface LogoProps {
	width: number;
	height: number;
	/** Size / opacity utilities only — do NOT pass display classes. */
	className?: string;
	/** Empty (default) → decorative (aria-hidden). Non-empty → a11y name. */
	alt?: string;
}

/**
 * Brand mark with an automatic dark-mode variant.
 *
 * Renders BOTH SVGs and lets CSS pick one via the `.dark` class
 * (next-themes sets it before first paint). Pure CSS swap → SSR-safe:
 * no hydration mismatch, no theme flash, no JS. The component owns the
 * `display` utility (`block dark:hidden` / `hidden dark:block`) so
 * callers must keep display classes out of `className`.
 */
export function Logo({ width, height, className = "", alt = "" }: LogoProps) {
	const a11y =
		alt === "" ? ({ alt: "", "aria-hidden": true } as const) : { alt };
	return (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/assets/logo.svg"
				width={width}
				height={height}
				className={`block dark:hidden ${className}`}
				{...a11y}
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/assets/logo-dark.svg"
				width={width}
				height={height}
				className={`hidden dark:block ${className}`}
				{...a11y}
			/>
		</>
	);
}
