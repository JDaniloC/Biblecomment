"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationContextValue {
  handleNotification: (type: NotificationType, message: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue>({
  handleNotification: () => {},
});

interface Toast {
  id: number;
  type: NotificationType;
  message: string;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ handleNotification }}>
      {children}
      <div
        role="region"
        aria-label="Notificações"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className={`toast toast-${toast.type} pointer-events-auto`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
