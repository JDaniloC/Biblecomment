/**
 * Snapshot of a user safe to surface in the admin/moderation user listing.
 * Mirrors [[PublicUserDTO]] but adds moderator-only fields (email, mod
 * flag) and drops badges/belief (not relevant for the cadastros view).
 * Never includes the password hash, tutorial progress, or showBelief
 * toggle.
 */
export interface AdminUserDTO {
	_id: string;
	username: string;
	displayName?: string;
	email: string;
	state?: string;
	moderator: boolean;
	createdAt: Date;
}
