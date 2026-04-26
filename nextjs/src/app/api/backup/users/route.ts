import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { BackupUsersUseCase } from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { BackupUsersSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoUserRepository();
    const useCase = new BackupUsersUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const parsed = await parseBody(req, BackupUsersSchema);
    if (!parsed.ok) return parsed.response;

    const repo = new MongoUserRepository();
    let imported = 0;

    for (const raw of parsed.data.users) {
      const existing = await repo.findByEmail(raw.email);
      if (existing) continue;

      const placeholder = await bcrypt.hash(
        `placeholder:${raw.email}:${Date.now()}:${Math.random()}`,
        12,
      );

      await repo.create({
        email: raw.email,
        username: raw.username,
        state: raw.state,
        belief: raw.belief,
        password: placeholder,
        passwordType: "bcrypt",
        moderator: false,
      });
      imported += 1;
    }

    return NextResponse.json({ imported }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
