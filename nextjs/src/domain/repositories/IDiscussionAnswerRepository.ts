import { DiscussionAnswer } from "../entities/DiscussionAnswer";

export interface IDiscussionAnswerRepository {
  add(input: {
    discussionId: string;
    userId: string;
    username: string;
    text: string;
  }): Promise<DiscussionAnswer>;

  /** Edit the text of an existing answer. Returns null when not found. */
  update(answerId: string, text: string): Promise<DiscussionAnswer | null>;

  findById(answerId: string): Promise<DiscussionAnswer | null>;

  /** All answers for a discussion, ordered by createdAt asc (oldest first). */
  findByDiscussion(discussionId: string): Promise<DiscussionAnswer[]>;

  /** Batch count for the discussion list page. */
  countByDiscussion(discussionIds: string[]): Promise<Map<string, number>>;

  /** All answers authored by a user — used by the LGPD data export. */
  findByUser(userId: string): Promise<DiscussionAnswer[]>;

  /** Has the user authored any answer? Used by the badge evaluator. */
  userHasAnsweredAny(userId: string): Promise<boolean>;

  /**
   * Top-N discussions by latest-answer timestamp. Returns
   * `[{ discussionId, lastAnswerAt, answerCount }]` ordered desc by
   * lastAnswerAt. Used by the /home "Discussões ativas" feed.
   */
  latestPerDiscussion(
    limit: number,
  ): Promise<Array<{ discussionId: string; lastAnswerAt: Date; answerCount: number }>>;

  /** LGPD cascade — rewrites username on every row authored by the user. */
  anonymizeByUser(userId: string, replacement: string): Promise<number>;

  /** Cascade when a discussion is hard-deleted. */
  deleteByDiscussion(discussionId: string): Promise<number>;
}
