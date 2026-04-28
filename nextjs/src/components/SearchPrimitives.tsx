"use client";

interface HighlightTextProps {
  text: string;
  query: string;
}

export function HighlightText({ text, query }: HighlightTextProps) {
  if (!query || query.length < 2) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="bg-brand-soft text-brand rounded-sm px-px">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  );
}

const AVATAR_COLORS = [
  "#137ddb",
  "#7c3aed",
  "#ea580c",
  "#059669",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

export function UserAvatar({ username, size = 20 }: { username: string; size?: number }) {
  const initial = (username ?? "?")[0].toUpperCase();
  const color = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(9, Math.round(size / 2))
      }}
    >
      {initial}
    </span>
  );
}

