/**
 * A day on which the user genuinely engaged with reading — registered
 * once they accumulate enough active time on chapter pages (the client
 * tracker handles the threshold). One document per (userId, date).
 *
 * `date` is the Brazil-time calendar day as "YYYY-MM-DD" so the streak
 * boundary matches the RPSP plan and the reminder scheduler.
 */
export interface ReadingSession {
	_id?: string;
	userId: string;
	/** BRT calendar day, "YYYY-MM-DD". */
	date: string;
	createdAt?: Date;
}
