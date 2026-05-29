"use client";

interface Props {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
  /** Visible/hover label, default "Útil". */
  label?: string;
  testId?: string;
}

/**
 * Heart "like" toggle shared by comments, discussions and answers. Mirrors the
 * inline button the chapter reader uses (heart + "Útil · N"); when liked the
 * heart fills and turns brand-colored.
 */
export function LikeButton({ liked, count, onToggle, disabled, label = "Útil", testId }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={label}
      data-testid={testId}
      aria-pressed={liked}
      className={`flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs whitespace-nowrap transition disabled:opacity-50 ${
        liked ? "text-brand" : "text-slate-400 dark:text-slate-500 hover:text-brand"
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{label} · </span>
      {count}
    </button>
  );
}
