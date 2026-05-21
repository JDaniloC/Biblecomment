"use client";

/**
 * Reusable on/off switch styled to match the Privacidade toggles. Used
 * by the privacy section (show belief, show history) and the
 * reading-reminder opt-in card. Renders as `role="switch"` so screen
 * readers describe it correctly.
 */
export function Toggle({
	checked,
	onChange,
	disabled = false,
	ariaLabel,
	dataTestid,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
	ariaLabel?: string;
	dataTestid?: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			disabled={disabled}
			data-testid={dataTestid}
			onClick={() => onChange(!checked)}
			className={`shrink-0 w-9 h-5 rounded-[10px] border-none cursor-pointer relative transition-colors duration-200 p-0 mt-px disabled:opacity-60 disabled:cursor-not-allowed ${
				checked ? "bg-brand" : "bg-slate-300 dark:bg-slate-600"
			}`}
		>
			<span
				className={`absolute top-[3px] w-[14px] h-[14px] rounded-[7px] bg-white shadow transition-[left] duration-200 ${
					checked ? "left-[17px]" : "left-[3px]"
				}`}
			/>
		</button>
	);
}
