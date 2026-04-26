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
      <div>
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
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
