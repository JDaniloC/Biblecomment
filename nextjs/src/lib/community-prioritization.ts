/**
 * Comment↔community is DERIVED from approved membership (plan_community):
 * given the set of usernames approved in the reader's active community,
 * split a verse's comments into "prioritized" (from approved members)
 * and "others", preserving the input order within each bucket.
 *
 * Pure + order-stable so it's unit-testable and reusable from both
 * comment API routes. Matching is by `username` because comments store
 * the author username (not User._id).
 */
export function partitionByApproved<T extends { username: string }>(
	comments: T[],
	approvedUsernames: ReadonlySet<string>,
): { prioritized: T[]; others: T[] } {
	const prioritized: T[] = [];
	const others: T[] = [];
	for (const c of comments) {
		if (approvedUsernames.has(c.username)) prioritized.push(c);
		else others.push(c);
	}
	return { prioritized, others };
}
