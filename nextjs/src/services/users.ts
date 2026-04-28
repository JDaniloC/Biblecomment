"use client";

import axios from "axios";
import {
  updateProfileAction,
  deleteSelfAction,
  changePasswordAction,
  setModeratorAction,
} from "@/app/actions/users";
import { actionError } from "./_action-error";

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface UserProfile {
  email: string;
  username: string;
  belief?: string;
  stateName?: string;
  createdAt?: string;
  booksCount: number;
  chaptersCount: number;
  commentsCount: number;
}

export interface UserListItem {
  username: string;
  email?: string;
  belief?: string;
  stateName?: string;
  total_comments: number;
}

export interface ProfileUpdateInput {
  belief?: string;
  state?: string;
}

export const usersService = {
  // Register stays on axios — anonymous flow, no session, never a Server Action target.
  async register(input: RegisterInput): Promise<{ email: string; username: string }> {
    const res = await axios.post<{ email: string; username: string }>("/api/users", input);
    return res.data;
  },

  async list(page: number = 1): Promise<UserListItem[]> {
    const res = await axios.get<UserListItem[]>(`/api/users?pages=${page}`);
    return res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await axios.get<UserProfile>("/api/users/me");
    return res.data;
  },

  async updateProfile(updates: ProfileUpdateInput): Promise<void> {
    const result = await updateProfileAction(updates);
    if (!result.ok) actionError(result.error);
  },

  async deleteSelf(email: string): Promise<void> {
    const result = await deleteSelfAction(email);
    if (!result.ok) actionError(result.error);
  },

  async setModerator(email: string, moderator: boolean): Promise<{ email: string; username: string; moderator: boolean }> {
    const result = await setModeratorAction(email, moderator);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const result = await changePasswordAction(currentPassword, newPassword);
    if (!result.ok) actionError(result.error);
  },
};
