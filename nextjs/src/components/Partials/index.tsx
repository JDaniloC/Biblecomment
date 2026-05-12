"use client";

import Link from "next/link";
import ReactLoading from "react-loading";

export function Loading() {
  return (
    <div className="flex justify-center items-center py-8">
      <ReactLoading type="spokes" color="black" />
    </div>
  );
}

export function HelpButton() {
  return (
    <Link href="/help">
      <span className="fixed bottom-6 right-6 bg-yellow-400 text-black font-bold text-sm px-4 py-3 rounded-full shadow-lg cursor-pointer hover:bg-yellow-500 transition z-50">
        Precisa de ajuda?
      </span>
    </Link>
  );
}
