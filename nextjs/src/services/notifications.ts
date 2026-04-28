"use client";

import axios from "axios";
import type { Notification } from "@/domain/entities/Notification";

export interface NotificationsPage {
  page: number;
  pageSize: number;
  items: Notification[];
  unread: number;
}

export const notificationsService = {
  async list(page: number = 1): Promise<NotificationsPage> {
    const res = await axios.get<NotificationsPage>(`/api/notifications?page=${page}`);
    return res.data;
  },

  async markRead(id: string): Promise<Notification> {
    const res = await axios.patch<Notification>(`/api/notifications/${id}`);
    return res.data;
  },

  async markAllRead(): Promise<number> {
    const res = await axios.post<{ updated: number }>(`/api/notifications?action=mark-all-read`);
    return res.data.updated;
  },
};
