import type { SVGProps } from "react";
import type { TagIconName } from "@/lib/tag-meta";

const COMMON: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

interface Props extends SVGProps<SVGSVGElement> {
  name: TagIconName;
}

export function TagIcon({ name, ...rest }: Props) {
  const props = { ...COMMON, ...rest };
  switch (name) {
    case "sunrise":
      return (
        <svg {...props}>
          {/* Sun rising over horizon — half-sun + rays */}
          <path d="M17 18a5 5 0 0 0-10 0" />
          <line x1="12" y1="3" x2="12" y2="9" />
          <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
          <line x1="1" y1="18" x2="3" y2="18" />
          <line x1="21" y1="18" x2="23" y2="18" />
          <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          <line x1="23" y1="22" x2="1" y2="22" />
        </svg>
      );
    case "book-open":
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "pen":
      return (
        <svg {...props}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      );
    case "comment":
    default:
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}
