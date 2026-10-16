/**
 * Shape of the self-service data export (LGPD Art. 18 II/V), built by
 * ExportUserDataUseCase and served by GET /api/users/me/export.
 *
 * Version 1 was the unversioned file (profile, comments, ownedDiscussions,
 * answersAuthored, notifications). Version 2 keeps those keys, and the
 * comment fields the self-service import reads (bookReference, text,
 * tags[], onTitle), and adds the rest of the account's data. Every field is
 * whitelisted: dates are ISO strings, absent optional values are explicit
 * null, so the shape is stable for anyone parsing it.
 */
export const USER_DATA_EXPORT_VERSION = 2 as const;

export interface ExportedProfile {
	_id: string;
	email: string;
	username: string;
	displayName: string | null;
	state: string | null;
	belief: string | null;
	showBelief: boolean;
	moderator: boolean;
	emailVerifiedAt: string | null;
	pendingEmail: string | null;
	tutorialsCompleted: string[];
	badges: string[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExportedComment {
	_id: string;
	username: string;
	verseId: string;
	bookReference: string;
	onTitle: boolean;
	text: string;
	tags: string[];
	communitySlug: string | null;
	verified: boolean;
	verifiedAt: string | null;
	hiddenAt: string | null;
	hiddenReason: "moderator" | "account-disabled" | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExportedDiscussion {
	_id: string;
	username: string;
	bookAbbrev: string;
	commentId: string | null;
	verseReference: string;
	verseText: string;
	commentText: string;
	quoteStart: number | null;
	quoteEnd: number | null;
	title: string;
	question: string;
	answersCount: number;
	likeCount: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExportedAnswer {
	answerId: string;
	discussionId: string;
	/** Null once the discussion no longer exists. */
	verseReference: string | null;
	discussionTitle: string | null;
	text: string;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExportedNotification {
	type: string;
	resourceType: string;
	resourceId: string;
	actor: string;
	message: string;
	url: string;
	read: boolean;
	createdAt: string | null;
}

export interface ExportedCommentLike {
	commentId: string;
	/** Null once the comment no longer exists. */
	bookReference: string | null;
	likedAt: string | null;
}

export interface ExportedDiscussionLike {
	discussionId: string;
	verseReference: string | null;
	title: string | null;
	likedAt: string | null;
}

export interface ExportedAnswerLike {
	answerId: string;
	likedAt: string | null;
}

export interface ExportedCommentReport {
	commentId: string;
	bookReference: string | null;
	reportedAt: string | null;
}

export interface ExportedCreatedCommunity {
	communityId: string;
	slug: string;
	name: string;
	description: string;
	createdAt: string | null;
}

export interface ExportedCommunityMembership {
	communityId: string;
	/** Null once the community no longer exists. */
	slug: string | null;
	name: string | null;
	status: "pending" | "approved";
	role: "member" | "moderator";
	joinedAt: string | null;
}

export interface ExportedCommunityFollow {
	communityId: string;
	slug: string | null;
	name: string | null;
	followedAt: string | null;
}

export interface ExportedFollow {
	username: string;
	displayName: string | null;
	since: string | null;
}

export interface ExportedChapterRead {
	book: string;
	chapter: number;
	readAt: string | null;
}

export interface ExportedReminder {
	enabled: boolean;
	hourLocal: number;
	tz: string;
	lastSentAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ExportedPushSubscription {
	/** Origin of the push service (e.g. https://fcm.googleapis.com); null if unparseable. */
	service: string | null;
	userAgent: string | null;
	createdAt: string | null;
}

export interface NotIncludedEntry {
	data: string;
	reason: string;
}

export interface UserDataExport {
	exportVersion: typeof USER_DATA_EXPORT_VERSION;
	generatedAt: string;
	profile: ExportedProfile;
	comments: ExportedComment[];
	ownedDiscussions: ExportedDiscussion[];
	answersAuthored: ExportedAnswer[];
	notifications: ExportedNotification[];
	likesGiven: {
		comments: ExportedCommentLike[];
		discussions: ExportedDiscussionLike[];
		answers: ExportedAnswerLike[];
	};
	commentReports: ExportedCommentReport[];
	communities: {
		created: ExportedCreatedCommunity[];
		memberships: ExportedCommunityMembership[];
		follows: ExportedCommunityFollow[];
	};
	social: {
		following: ExportedFollow[];
		followers: ExportedFollow[];
	};
	reading: {
		chaptersRead: ExportedChapterRead[];
		activeDays: string[];
		reminder: ExportedReminder | null;
	};
	pushSubscriptions: ExportedPushSubscription[];
	notIncluded: NotIncludedEntry[];
}

/**
 * What the file deliberately leaves out, and why (shown to the user in the
 * file itself). Keep the browser-only list in sync with privacy §7. It
 * mirrors the client's storage: theme (next-themes), `bc-text-scale`,
 * `bc:voice`, `bc:haptic`, `bc:community-filter:*`, `bc:reading-seconds:*`,
 * the per-device `tutorial:*` and onboarding flags, and the offline Bible
 * (`bc-offline-bible` plus IndexedDB). Completed tutorials and reading days
 * are also stored server-side, and those are exported.
 */
export const USER_DATA_EXPORT_NOT_INCLUDED: readonly NotIncludedEntry[] = [
	{
		data: "Senha",
		reason:
			"Guardamos apenas o hash bcrypt da senha, que é uma credencial e não é exportado.",
	},
	{
		data: "Tokens de verificação de e-mail e de redefinição de senha",
		reason: "São credenciais temporárias, válidas por pouco tempo.",
	},
	{
		data: "Endereço (endpoint) e chaves das notificações push",
		reason:
			"Funcionam como credencial do dispositivo e já ficam no seu navegador; exportamos apenas o serviço de push, o navegador e a data de ativação.",
	},
	{
		data: "Notificações que suas ações geraram para outras pessoas",
		reason:
			"Ficam na caixa de entrada de quem as recebeu; as ações em si (comentários, respostas, curtidas, quem você segue) estão neste arquivo.",
	},
	{
		data: "Identidade de moderadores",
		reason:
			"Quem verificou ou ocultou seus comentários é dado de outra pessoa; mantemos o estado, a data e o motivo.",
	},
	{
		data: "Ações de moderação que você realizou",
		reason:
			"Referem-se a registros de outras pessoas; solicite pelo e-mail contato@biblecomment.com.br.",
	},
	{
		data: "Logs operacionais (endereço IP, horário e navegador)",
		reason:
			"Ficam com os provedores de hospedagem e de monitoramento de erros por até 6 meses; solicite pelo e-mail contato@biblecomment.com.br.",
	},
	{
		data: "Dados guardados só no navegador",
		reason:
			"Tema, tamanho da fonte, voz da narração, vibração, filtro de comunidade, o tempo de leitura do dia ainda não registrado, a marcação dos tutoriais vistos neste aparelho e a Bíblia offline ficam apenas no armazenamento local do seu navegador e não são enviados ao servidor. Os tutoriais concluídos na sua conta e os dias de leitura registrados estão neste arquivo.",
	},
];
