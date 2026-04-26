import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { BackupUsersUseCase } from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";

interface BackupUserInput {
  email?: unknown;
  username?: unknown;
  state?: unknown;
  belief?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoUserRepository();
    const useCase = new BackupUsersUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const body = (await req.json()) as { users?: BackupUserInput[] };
    const incoming = Array.isArray(body.users) ? body.users : [];

    const repo = new MongoUserRepository();
    let imported = 0;

    for (const raw of incoming) {
      if (!isNonEmptyString(raw.email) || !isNonEmptyString(raw.username)) continue;

      const existing = await repo.findByEmail(raw.email);
      if (existing) continue;

      const placeholder = await bcrypt.hash(
        `placeholder:${raw.email}:${Date.now()}:${Math.random()}`,
        12,
      );

      await repo.create({
        email: raw.email,
        username: raw.username,
        state: isNonEmptyString(raw.state) ? raw.state : undefined,
        belief: isNonEmptyString(raw.belief) ? raw.belief : undefined,
        password: placeholder,
        passwordType: "bcrypt",
        moderator: false,
      });
      imported += 1;
    }

    return NextResponse.json({ imported }, { status: 201 });
  } catch {
    return serverError();
  }
}
