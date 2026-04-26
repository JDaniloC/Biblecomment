"use client";

import { memo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  abbrev: string;
  chaptersAmount: number;
  onCloseButtonClick: () => void;
  onSelectChapter: (abbrev: string, chapter: number) => void;
}

function ChapterChooser({ abbrev, chaptersAmount, onCloseButtonClick, onSelectChapter }: Props) {
  const [chapterList, setChapterList] = useState<number[]>([]);

  useEffect(() => {
    setChapterList(Array.from({ length: chaptersAmount }, (_, i) => i + 1));
  }, [chaptersAmount]);

  const onChapterClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const chapterNumber = parseInt(e.currentTarget.getAttribute("data-number") ?? "1", 10);
    onSelectChapter(abbrev, chapterNumber);
  }, [abbrev, onSelectChapter]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Escolha o capítulo</h2>
        <button type="button" onClick={onCloseButtonClick} className="text-gray-400 hover:text-gray-600">
          <Image src="/assets/x.svg" alt="Fechar" width={20} height={20} />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5 max-h-60 overflow-y-auto">
        {chapterList.map((chapter) => (
          <Link
            key={chapter}
            href={`/verses/${abbrev}/${chapter}`}
            data-number={chapter}
            onMouseDown={onChapterClick}
            className="text-center text-sm py-1.5 rounded border border-gray-200 text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            {chapter}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default memo(ChapterChooser);
