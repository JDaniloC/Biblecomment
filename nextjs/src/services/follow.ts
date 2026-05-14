"use client";

import { followUserAction, unfollowUserAction } from "@/app/actions/follow";
import { actionError } from "./_action-error";

export const followService = {
  async follow(targetUsername: string): Promise<void> {
    const result = await followUserAction(targetUsername);
    if (!result.ok) actionError(result.error);
  },

  async unfollow(targetUsername: string): Promise<void> {
    const result = await unfollowUserAction(targetUsername);
    if (!result.ok) actionError(result.error);
  },
};
