import type { ReactElement, SVGProps } from "react";

/**
 * Inline SVG mapping for the badge catalog icons. Names mirror lucide.dev
 * so the catalog stays portable if we ever swap to lucide-react.
 *
 * Paths are deliberately simple — recognizable silhouettes rather than
 * exact lucide replicas — so we don't pull a dependency for ~13 icons.
 *
 * `Lock` is the fallback rendered on locked badge cards.
 */
type IconRenderer = (props: SVGProps<SVGSVGElement>) => ReactElement;

const COMMON: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const ICONS: Record<string, IconRenderer> = {
  BookOpen: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  BookOpenCheck: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7a4 4 0 0 0-4-4Z" />
      <path d="m16 12 2 2 4-4" />
      <path d="M12 21V7a4 4 0 0 1 4-4h4v11" />
    </svg>
  ),
  BookmarkCheck: (p) => (
    <svg {...COMMON} {...p}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
      <path d="m9 10 2 2 4-4" />
    </svg>
  ),
  ScrollText: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M15 12h-5" />
      <path d="M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </svg>
  ),
  MessageCircle: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  MessagesSquare: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" />
      <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
    </svg>
  ),
  LibraryBig: (p) => (
    <svg {...COMMON} {...p}>
      <rect width="8" height="18" x="3" y="3" rx="1" />
      <path d="M7 3v18" />
      <path d="M20.4 18.9 16.5 7a1 1 0 0 0-1.3-.6l-2.8 1A1 1 0 0 0 11.8 8L15.7 20a1 1 0 0 0 1.3.6l2.8-1a1 1 0 0 0 .6-1.7Z" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6Z" />
    </svg>
  ),
  Smile: (p) => (
    <svg {...COMMON} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  ),
  Feather: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" x2="2" y1="8" y2="22" />
      <line x1="17.5" x2="9" y1="15" y2="15" />
    </svg>
  ),
  Heart: (p) => (
    <svg {...COMMON} {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Reply: (p) => (
    <svg {...COMMON} {...p}>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  ),
  AtSign: (p) => (
    <svg {...COMMON} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
  Lock: (p) => (
    <svg {...COMMON} {...p}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

interface BadgeIconProps extends SVGProps<SVGSVGElement> {
  /** Catalog icon name. Falls back to Lock if unknown. */
  name: string;
}

export function BadgeIcon({ name, ...rest }: BadgeIconProps) {
  const render = ICONS[name] ?? ICONS.Lock;
  return render(rest);
}
