"use client";

import { Verse } from "@/domain/entities/Verse";
import { CopyVerseButton } from "@/components/CopyVerseButton";

interface ChapterReaderProps {
  abbrev: string;
  chapter: number;
  verses: Verse[];
  // Per-verse comment counts by verse _id. Empty in the offline shell.
  countMap?: Record<string, number>;
  // Currently-open verse (drives the highlight). Null in the offline shell.
  selectedVerse?: Verse | null;
  // Whether the title/overview panel is open (suppresses verse highlight).
  isTitleMode?: boolean;
  // Tapping a verse opens its comment panel. Omitted offline → verses are
  // plain (no panel) but still copyable.
  onSelectVerse?: (verse: Verse) => void;
}

// Presentational verse column shared by the online ChapterClient and the
// offline /leitura-offline shell. Renders identically in both; the offline
// caller simply omits the comment-related props (countMap/selection/onSelect),
// so there are no badges and tapping a verse does nothing but copy.
export function ChapterReader({
  abbrev,
  chapter,
  verses,
  countMap = {},
  selectedVerse = null,
  isTitleMode = false,
  onSelectVerse,
}: ChapterReaderProps) {
  return (
    <div className="relative">
      <div className="hidden md:block absolute right-full top-0 -mr-5 z-10 text-right font-serif select-none pointer-events-none text-[80px] leading-[80px] font-black text-slate-800 dark:text-slate-100 opacity-80">
        {chapter}
      </div>

      <ul className="space-y-[2px]">
        {verses.map((verse, idx) => {
          const count = verse._id ? (countMap[verse._id] ?? 0) : 0;
          // Guard on a real _id: offline verses have none, and without this
          // `undefined === undefined` would mark every verse "selected".
          const isSelected =
            Boolean(verse._id) && selectedVerse?._id === verse._id && !isTitleMode;
          return (
            <li
              key={verse._id ?? `${verse.verseNumber}`}
              id={String(verse.verseNumber)}
              data-tour={idx === 0 ? "verse-first" : undefined}
              className="group relative"
            >
              <button
                type="button"
                onClick={() => onSelectVerse?.(verse)}
                className={`flex items-start gap-2 md:gap-3 w-full text-left rounded-r-[4px] transition border-l-4 border-solid pt-3 pr-2.5 pl-1.5 md:pl-3 md:pt-2 md:pb-2 hover:bg-[rgba(19,125,219,0.07)] dark:hover:bg-[rgba(19,125,219,0.16)] active:bg-[rgba(19,125,219,0.12)] dark:active:bg-[rgba(19,125,219,0.22)] min-h-[44px] ${count > 0 ? "pb-7 md:pb-2" : "pb-3"}`}
                style={{
                  borderLeftColor: isSelected ? "#137ddb" : "transparent",
                  background: isSelected ? "rgba(19,125,219,0.04)" : undefined,
                }}
              >
                <span
                  className="font-sans font-bold text-[14px] md:text-[13px] w-5 md:w-5 flex-shrink-0 text-right mt-[2px] transition"
                  style={{ color: isSelected ? "#137ddb" : "#94a3b8" }}
                >
                  {verse.verseNumber}
                </span>
                <span
                  data-testid="verse-text"
                  className="flex-1 font-serif leading-[1.85] transition text-[#1a1a1a] dark:text-slate-100"
                  style={{ fontSize: "17px" }}
                >
                  {verse.text}
                </span>
                {count > 0 && (
                  <span className="hidden md:flex flex-shrink-0 items-center gap-1 h-[15px] px-2 rounded-[20px] bg-brand">
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="font-bold text-[11px] text-white leading-[11px]">
                      {count}
                    </span>
                  </span>
                )}
              </button>
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="md:hidden absolute right-2 bottom-1.5 flex items-center gap-1 h-[15px] px-2 rounded-[20px] bg-brand pointer-events-none"
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="font-bold text-[11px] text-white leading-[11px]">
                    {count}
                  </span>
                </span>
              )}
              <div className="absolute right-[-10px] top-1 rounded-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity opacity-60">
                <CopyVerseButton
                  verse={{
                    abbrev,
                    chapter,
                    verseNumber: verse.verseNumber,
                    text: verse.text,
                  }}
                  label=""
                  className="!px-1.5 !py-1"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
