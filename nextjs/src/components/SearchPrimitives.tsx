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
      <span
        style={{
          background: "rgba(19,125,219,0.12)",
          color: "#137ddb",
          borderRadius: 2,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        fontSize: Math.max(9, Math.round(size / 2)),
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {initial}
    </span>
  );
}

export const SEARCH_SPIN_KEYFRAMES = `@keyframes spin { to { transform: rotate(360deg); } }`;
