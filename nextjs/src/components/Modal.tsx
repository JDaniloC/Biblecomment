"use client";

import React, { useEffect, useCallback } from "react";
import Image from "next/image";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  noPadding?: boolean;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
  "2xl": "max-w-[960px]",
};

export default function Modal({ show, onClose, children, title, size = "lg", noPadding = false }: ModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (show) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [show, handleKey]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        aria-label="Fechar"
      />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size] ?? SIZE_CLASSES.lg} max-h-[80vh] flex flex-col overflow-hidden`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="font-semibold text-gray-800">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Fechar"
            >
              <Image src="/assets/x.svg" alt="Fechar" width={14} height={14} />
            </button>
          </div>
        )}
        <div className={`overflow-y-auto flex-1${noPadding ? "" : " p-5"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
