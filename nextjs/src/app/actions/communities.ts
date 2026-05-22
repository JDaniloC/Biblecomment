"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { CreateCommunityUseCase } from "@/application/use-cases/CommunityUseCases";
import { CreateCommunitySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

/**
 * Server Action used by the /communities/new form. Surfaces the same domain
 * errors the API does (slug taken, per-user cap) so the client can display
 * field-level messages without inspecting an HTTP status.
 */
export async function createCommunityAction(input: {
  slug: string;
  name: string;
  description?: string;
}): Promise<ActionResult<{ slug: string }>> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Unauthorized" };

  const parsed = CreateCommunitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const community = await new CreateCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoUserRepository(),
      new MongoCommunityMembershipRepository(),
      new MongoCommunityFollowRepository(),
    ).execute({
      actorEmail: session.user.email,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    revalidatePath("/communities");
    return { ok: true, data: { slug: community.slug } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    if (msg.includes("in use")) {
      return { ok: false, error: "Esse identificador já está em uso." };
    }
    if (msg.includes("limit")) {
      return {
        ok: false,
        error: "Você atingiu o limite de 3 comunidades criadas.",
      };
    }
    logger.error({ err, action: "createCommunityAction" }, "create community failed");
    return { ok: false, error: msg };
  }
}
