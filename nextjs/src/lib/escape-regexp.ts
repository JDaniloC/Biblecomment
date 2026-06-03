/** Escape a user string so it is treated as a literal inside a RegExp. */
export function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
