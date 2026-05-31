"use client";

import axios from "axios";
import {
	createDiscussionAction,
	addAnswerAction,
	updateAnswerAction,
	deleteDiscussionAction,
	toggleDiscussionLikeAction,
} from "@/app/actions/discussions";
import type { DiscussionWire } from "@/lib/discussion-wire";
import type { DiscussionLikeTarget } from "@/domain/repositories/IDiscussionLikeRepository";
import type { ToggleDiscussionLikeResult } from "@/application/use-cases/DiscussionLikeUseCases";
import { actionError } from "./_action-error";

export interface DiscussionDraft {
	/** The comment this discussion is anchored to. */
	commentId: string;
	/** One-line headline (line breaks stripped server-side). */
	title: string;
	/** The discussion's opening message ("comentário da discussão"). */
	body: string;
	/** Optional highlighted excerpt offsets into the comment text. */
	quoteStart?: number;
	quoteEnd?: number;
}

export interface DiscussionSummary {
	_id: string;
	username: string;
	question: string;
	verseReference: string;
	bookAbbrev: string;
	/** Phase 9.3: list endpoint ships pre-aggregated count instead of inline answers. */
	answersCount: number;
	createdAt?: string;
	updatedAt?: string;
}

export const discussionsService = {
	async createForBook(
		bookAbbrev: string,
		draft: DiscussionDraft,
	): Promise<DiscussionWire> {
		const result = await createDiscussionAction(bookAbbrev, draft);
		if (!result.ok) actionError(result.error);
		return result.data;
	},

	async getForBook(
		bookAbbrev: string,
		page = 1,
	): Promise<DiscussionWire[]> {
		const res = await axios.get<DiscussionWire[]>(
			`/api/discussion/${bookAbbrev}?pages=${page}`,
		);
		return res.data;
	},

	async getById(bookAbbrev: string, id: string): Promise<DiscussionWire> {
		const res = await axios.get<DiscussionWire>(
			`/api/discussion/${bookAbbrev}/${id}`,
		);
		return res.data;
	},

	async addAnswer(
		bookAbbrev: string,
		id: string,
		text: string,
	): Promise<DiscussionWire> {
		const result = await addAnswerAction(bookAbbrev, id, text);
		if (!result.ok) actionError(result.error);
		return result.data;
	},

	async updateAnswer(
		bookAbbrev: string,
		discussionId: string,
		answerId: string,
		text: string,
	): Promise<DiscussionWire> {
		const result = await updateAnswerAction(
			bookAbbrev,
			discussionId,
			answerId,
			text,
		);
		if (!result.ok) actionError(result.error);
		return result.data;
	},

	async delete(bookAbbrev: string, id: string): Promise<void> {
		const result = await deleteDiscussionAction(bookAbbrev, id);
		if (!result.ok) actionError(result.error);
	},

	async listAll(page = 1): Promise<DiscussionSummary[]> {
		const res = await axios.get<DiscussionSummary[]>(
			`/api/discussions?pages=${page}`,
		);
		return res.data;
	},

	async toggleLike(
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<ToggleDiscussionLikeResult> {
		const result = await toggleDiscussionLikeAction(targetType, targetId);
		if (!result.ok) actionError(result.error);
		return result.data;
	},
};
