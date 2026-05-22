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
	/** True when the account is disabled (derived from `disabledAt`). */
	disabled: boolean;
	/** When the account was disabled by a moderator; absent on active accounts. */
	disabledAt?: Date;
	/** Username of the moderator who disabled the account. */
	disabledBy?: string;
	createdAt: Date;
}
