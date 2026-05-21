import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoReadingReminderPreferenceRepository } from "@/infrastructure/repositories/MongoReadingReminderPreferenceRepository";
import {
	GetReadingReminderUseCase,
	UpdateReadingReminderUseCase,
} from "@/application/use-cases/ReadingReminderUseCases";
import { parseBody } from "@/lib/parse-body";
import { unauthorized, serverError } from "@/lib/get-session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
	enabled: z.boolean(),
	hourLocal: z.number().min(0).max(23.5),
	tz: z.string().optional(),
});

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.username) return unauthorized();
		const useCase = new GetReadingReminderUseCase(
			new MongoReadingReminderPreferenceRepository(),
		);
		const pref = await useCase.execute(session.user.username);
		return NextResponse.json(pref);
	} catch (err) {
		return serverError(err);
	}
}

export async function PUT(req: Request) {
	try {
		const session = await auth();
		if (!session?.user?.username) return unauthorized();

		const parsed = await parseBody(req, UpdateSchema);
		if (!parsed.ok) return parsed.response;

		const useCase = new UpdateReadingReminderUseCase(
			new MongoReadingReminderPreferenceRepository(),
		);
		const pref = await useCase.execute({
			username: session.user.username,
			enabled: parsed.data.enabled,
			hourLocal: parsed.data.hourLocal,
			tz: parsed.data.tz,
		});
		return NextResponse.json(pref);
	} catch (err) {
		return serverError(err);
	}
}
