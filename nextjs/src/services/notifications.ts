"use client";

import axios from "axios";
import type { Notification } from "@/domain/entities/Notification";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/actions/notifications";
import { actionError } from "./_action-error";

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
    const result = await markNotificationReadAction(id);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async markAllRead(): Promise<number> {
    const result = await markAllNotificationsReadAction();
    if (!result.ok) actionError(result.error);
    return result.data.updated;
  },
};
