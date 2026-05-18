import { getTagMetas } from "@/lib/tag-meta";
import { TagIcon } from "@/components/TagIcon";

interface Props {
  /** Comment tags; empty/unknown renders the single neutral "Comentário". */
  tags: string[];
  /** `sm` (profile/list cards) | `md` (chapter sidebar header). */
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: { icon: 12, h: "h-[20.5px]", text: "text-[11px] leading-[16.5px]", px: "pl-1.5 pr-2" },
  md: { icon: 14, h: "h-[22px]", text: "text-xs", px: "pl-2 pr-2.5" },
} as const;

/**
 * Renders ALL of a comment's categories as a row of colored pills, ordered
 * most-personal → most-studied (see getTagMetas). Pure/presentational —
 * safe in server and client components. Replaces the legacy single-tag
 * icon+label so secondary categories are no longer invisible.
 */
export function TagBadges({ tags, size = "sm", className = "" }: Props) {
  const sz = SIZES[size];
  return (
    <span
      data-testid="tag-badges"
      className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {getTagMetas(tags).map((meta) => (
        <span
          key={meta.label}
          className={`inline-flex items-center gap-1 rounded-[10px] ${sz.px} ${sz.h} shrink-0`}
          style={{ background: meta.bg, color: meta.color }}
        >
          <span aria-hidden="true" className="flex">
            <TagIcon name={meta.icon} width={sz.icon} height={sz.icon} />
          </span>
          <span className={`font-semibold whitespace-nowrap ${sz.text}`}>
            {meta.label}
          </span>
        </span>
      ))}
    </span>
  );
}
