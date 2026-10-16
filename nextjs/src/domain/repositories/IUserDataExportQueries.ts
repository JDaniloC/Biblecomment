import type { Discussion } from "../entities/Discussion";
import type { Notification } from "../entities/Notification";
import type { Follow } from "../entities/Follow";
import type { DiscussionLikeTarget } from "./IDiscussionLikeRepository";

/** A comment the user acted on (liked or reported), and when. */
export interface UserCommentAction {
	commentId: string;
	createdAt: Date;
}

export interface DiscussionLikeRow {
	targetType: DiscussionLikeTarget;
	targetId: string;
	createdAt: Date;
}

/**
 * Read-only queries the LGPD data export needs that no repository offers:
 * unpaginated, by user, across both slugs of an unfinished rename. Kept in
 * one port so the regular repositories (and their test fakes) don't grow
 * export-only methods. Results are newest first.
 */
export interface IUserDataExportQueries {
	/** Discussions opened under any of these usernames. */
	discussionsByUsernames(usernames: string[]): Promise<Discussion[]>;
	/** Every notification addressed to any of these usernames. */
	notificationsByRecipients(recipients: string[]): Promise<Notification[]>;
	commentLikesByUser(userId: string): Promise<UserCommentAction[]>;
	commentReportsByUser(userId: string): Promise<UserCommentAction[]>;
	/** Likes on discussions and on answers. */
	discussionLikesByUser(userId: string): Promise<DiscussionLikeRow[]>;
	/** Follow rows the user is part of, in either direction. */
	followsForUser(userId: string): Promise<Follow[]>;
}
