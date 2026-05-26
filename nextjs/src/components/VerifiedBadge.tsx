import * as React from "react";

const SIZE_PX: Record<NonNullable<VerifiedBadgeProps["size"]>, number> = {
  xs: 12,
  sm: 14,
  md: 18,
};

export interface VerifiedBadgeProps {
  verified: boolean | undefined | null;
  size?: "xs" | "sm" | "md";
  /** Optional override for the tooltip / aria-label text. */
  label?: string;
  className?: string;
}

/**
 * Inline checkmark-in-a-circle marking accounts whose email has been
 * confirmed. Renders `null` when `verified` is falsy so call-sites stay
 * condition-free. Size maps to a small icon footprint sized for inline
 * placement next to display names.
 */
export function VerifiedBadge({
  verified,
  size = "sm",
  label = "E-mail verificado",
  className,
}: VerifiedBadgeProps): React.ReactElement | null {
  if (!verified) return null;
  const px = SIZE_PX[size];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="verified-badge"
      className={`inline-flex items-center text-brand shrink-0 ${className ?? ""}`}
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-1.2 13.6 6-6-1.4-1.4-4.6 4.6-2.2-2.2L7.2 12l3.6 3.6z" />
      </svg>
    </span>
  );
}
