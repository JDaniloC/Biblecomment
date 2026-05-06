"use client";

import { getMyBadgesAction } from "@/app/actions/badges";
import type { UserBadgesView } from "@/application/use-cases/BadgeUseCases";
import { actionError } from "./_action-error";

export const badgesService = {
  async getMine(): Promise<UserBadgesView> {
    const r = await getMyBadgesAction();
    if (!r.ok) actionError(r.error);
    return r.data;
  },
};
