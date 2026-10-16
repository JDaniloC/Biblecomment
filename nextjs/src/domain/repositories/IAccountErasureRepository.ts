/**
 * Tombstone of a deleted account: only the internal id it had and when its
 * deletion was requested — no e-mail, username or content. A backup restore
 * checks it so an erased account (LGPD Art. 18 VI) is never re-created.
 */
export interface AccountErasure {
	userId: string;
	erasedAt: Date;
}

export interface IAccountErasureRepository {
	/**
	 * Record that `userId` was erased at `at`. Idempotent: a repeat keeps the
	 * latest date. Ids that can't be account ids are ignored.
	 */
	record(userId: string, at: Date): Promise<void>;
	/** The subset of `userIds` that have a tombstone. */
	findErased(userIds: string[]): Promise<Set<string>>;
	/** Every tombstone, oldest first (disaster-recovery export). */
	list(): Promise<AccountErasure[]>;
	/**
	 * Merge tombstones back in (disaster-recovery import), keeping the latest
	 * date per id. Invalid ids are skipped. Returns how many were new.
	 */
	upsertMany(rows: AccountErasure[]): Promise<number>;
}
