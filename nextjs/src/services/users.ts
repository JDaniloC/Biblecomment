"use client";

import axios from "axios";

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
    await axios.patch("/api/users", updates);
  },

  async deleteSelf(email: string): Promise<void> {
    await axios.delete("/api/users", { data: { email } });
  },

  async setModerator(email: string, moderator: boolean): Promise<{ email: string; username: string; moderator: boolean }> {
    const res = await axios.patch<{ email: string; username: string; moderator: boolean }>(
      "/api/users/moderator",
      { email, moderator },
    );
    return res.data;
  },
};
