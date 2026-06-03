/**
 * Portuguese relative timestamp for discussion/answer dates.
 *
 * "agora" (<1 min) · "há N min" (<1 h) · "há N h" (<1 dia) ·
 * "há N dia(s)" (<30 dias) · "dd/mm/yyyy" para qualquer coisa mais antiga.
 *
 * `now` é injetável para testes determinísticos (default: Date.now()).
 * Entradas inválidas retornam "" para nunca quebrar a UI.
 */
export function formatRelativeDate(
	input: string | Date,
	now: number = Date.now(),
): string {
	const ms =
		input instanceof Date ? input.getTime() : new Date(input).getTime();
	if (Number.isNaN(ms)) return "";

	const diff = now - ms;
	const min = 60 * 1000;
	const hour = 60 * min;
	const day = 24 * hour;

	if (diff < min) return "agora";
	if (diff < hour) return `há ${Math.floor(diff / min)} min`;
	if (diff < day) return `há ${Math.floor(diff / hour)} h`;
	if (diff < 30 * day) {
		const days = Math.floor(diff / day);
		return `há ${days} ${days === 1 ? "dia" : "dias"}`;
	}

	const d = new Date(ms);
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const yyyy = d.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}
