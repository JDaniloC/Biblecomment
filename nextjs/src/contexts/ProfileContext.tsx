"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import axios from "axios";
import { usersService } from "@/services/users";
import { useNotification } from "./NotificationContext";

export interface CommentItem {
  _id: string;
  text: string;
  tags: string[];
  username: string;
  bookReference: string;
  createdAt: string;
  likes: string[];
  verseId?: string;
  onTitle?: boolean;
}

interface ProfileContextValue {
  commentaries: CommentItem[];
  setCommentaries: (c: CommentItem[]) => void;
  addNewComment: (c: CommentItem) => void;
  getComments: (page?: number) => Promise<CommentItem[]>;
  getFavorites: (page?: number) => Promise<CommentItem[]>;
  updateAccount: (data: { belief?: string; stateName?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue>({
  commentaries: [],
  setCommentaries: () => {},
  addNewComment: () => {},
  getComments: async () => [],
  getFavorites: async () => [],
  updateAccount: async () => {},
  deleteAccount: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [commentaries, setCommentaries] = useState<CommentItem[]>([]);
  const { handleNotification } = useNotification();

  const addNewComment = useCallback((comment: CommentItem) => {
    setCommentaries((prev) => [comment, ...prev]);
  }, []);

  const getComments = useCallback(async (page = 1): Promise<CommentItem[]> => {
    try {
      const { data } = await axios.get(`/api/users/me/comments?page=${page}`);
      return data as CommentItem[];
    } catch {
      return [];
    }
  }, []);

  const getFavorites = useCallback(async (page = 1): Promise<CommentItem[]> => {
    try {
      const { data } = await axios.get(`/api/users/me/favorites?page=${page}`);
      return data as CommentItem[];
    } catch {
      return [];
    }
  }, []);

  const updateAccount = useCallback(async (updateData: { belief?: string; stateName?: string }) => {
    try {
      await usersService.updateProfile({ belief: updateData.belief, state: updateData.stateName });
      handleNotification("success", "Conta atualizada!");
    } catch {
      handleNotification("error", "Erro ao atualizar conta.");
    }
  }, [handleNotification]);

  const deleteAccount = useCallback(async () => {
    handleNotification("error", "Use o painel de perfil para excluir a conta.");
  }, [handleNotification]);

  return (
    <ProfileContext.Provider
      value={{
        commentaries,
        setCommentaries,
        addNewComment,
        getComments,
        getFavorites,
        updateAccount,
        deleteAccount,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
