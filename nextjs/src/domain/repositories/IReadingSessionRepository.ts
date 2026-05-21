export interface IReadingSessionRepository {
	/** Idempotently record that the user had a reading session on `date`
	 *  (BRT "YYYY-MM-DD"). Safe to call repeatedly within the same day. */
	registerDay(userId: string, date: string): Promise<void>;
	/** All BRT day-strings the user has a reading session for. */
	findDays(userId: string): Promise<string[]>;
}
