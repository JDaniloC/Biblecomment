"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usersService } from "@/services/users";
import { sanitizeUsername, MIN_USERNAME_LEN } from "@/lib/sanitize-username";

export default function RegisterPage() {
	return (
		<Suspense fallback={null}>
			<RegisterContent />
		</Suspense>
	);
}

function RegisterContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams?.get("callbackUrl");

	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const previewSlug = useMemo(
		() => sanitizeUsername(displayName),
		[displayName],
	);
	const slugIsValid = previewSlug.length >= MIN_USERNAME_LEN;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!acceptedTerms) {
			setError(
				"É necessário aceitar os Termos de Uso e a Política de Privacidade.",
			);
			return;
		}

		if (!slugIsValid) {
			setError(
				"Esse nome não gera um identificador válido (mínimo 2 letras/números).",
			);
			return;
		}

		setLoading(true);
		try {
			await usersService.register({
				email,
				displayName,
				password,
				acceptedTerms: true,
			});
			const loginUrl = callbackUrl
				? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
				: "/login";
			router.push(loginUrl);
		} catch (err: unknown) {
			const e = err as {
				response?: { data?: { error?: string } };
				message?: string;
			};
			setError(e.response?.data?.error ?? e.message ?? "Erro ao cadastrar.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen grid md:grid-cols-2 bg-stone-50 dark:bg-slate-950">
			{/* Branded panel — desktop only. Mirrors /login so the cadastro flow
          shares the same visual rest stop as sign-in. */}
			<aside
				aria-hidden="true"
				className="hidden md:flex flex-col justify-between bg-gradient-to-br from-amber-50 to-stone-100 dark:from-slate-900 dark:to-slate-950 p-12 border-r border-stone-200 dark:border-slate-800"
			>
				{/* tabIndex={-1}: keep the link clickable for mouse users but
            out of the tab order so the aria-hidden aside has no focusable
            descendants. Keyboard path home is the bottom "Voltar" link. */}
				<Link
					href="/"
					tabIndex={-1}
					className="flex items-center gap-3 no-underline"
				>
					<Logo width={40} height={40} />
					<div>
						<div className="font-bold text-stone-800 dark:text-stone-100 leading-tight">
							Bible Comment
						</div>
						<div className="text-xs text-stone-500 dark:text-stone-400">
							A Program for His Glory
						</div>
					</div>
				</Link>

				<div className="space-y-6 max-w-sm">
					<h2 className="font-lora text-3xl lg:text-4xl font-bold text-stone-800 dark:text-stone-100 leading-tight">
						Junte-se à comunidade de estudo bíblico.
					</h2>
					<ul className="space-y-3 text-stone-600 dark:text-stone-300">
						<li className="flex items-start gap-3">
							<span
								aria-hidden="true"
								className="mt-0.5 text-amber-700 dark:text-amber-300"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</span>
							<span>
								Comente versículos com tags devocional, exegética, pessoal ou
								inspirada.
							</span>
						</li>
						<li className="flex items-start gap-3">
							<span
								aria-hidden="true"
								className="mt-0.5 text-amber-700 dark:text-amber-300"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</span>
							<span>Abra discussões e contribua com outras perspectivas.</span>
						</li>
						<li className="flex items-start gap-3">
							<span
								aria-hidden="true"
								className="mt-0.5 text-amber-700 dark:text-amber-300"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</span>
							<span>
								Sem spam, sem newsletters: o e-mail é apenas para login.
							</span>
						</li>
					</ul>
					<p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
						Você pode exportar ou apagar todos os seus dados a qualquer momento
						— em conformidade com a LGPD.
					</p>
				</div>

				<p className="text-xs text-stone-500 dark:text-stone-400">
					&copy; {new Date().getFullYear()} Bible Comment
				</p>
			</aside>

			{/* Form panel */}
			<main
				id="main-content"
				className="flex flex-col items-center justify-center px-4 py-10 md:py-16"
			>
				<div className="w-full max-w-sm">
					{/* Mobile-only logo */}
					<Link
						href="/"
						className="md:hidden flex items-center justify-center gap-2 mb-8 no-underline"
					>
						<Logo width={32} height={32} />
						<span className="font-bold text-stone-800 dark:text-stone-100">
							Bible Comment
						</span>
					</Link>

					<header className="mb-8">
						<h1 className="font-lora text-3xl font-bold text-stone-800 dark:text-stone-100">
							Criar conta
						</h1>
						<p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
							Cadastre-se gratuitamente para participar dos estudos.
						</p>
					</header>

					{error && (
						<div
							role="alert"
							className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mt-0.5 flex-shrink-0"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<span>{error}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label
								htmlFor="register-displayname"
								className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
							>
								Seu nome
							</label>
							<div className="relative">
								<span
									aria-hidden="true"
									className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</span>
								<input
									id="register-displayname"
									type="text"
									autoComplete="name"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									required
									placeholder="Felipe Silva"
									className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
								/>
							</div>
							<p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
								{previewSlug ? (
									<>
										Aparece nos comentários. Seu identificador único será{" "}
										<code className="font-mono text-stone-600 dark:text-stone-300">
											@{previewSlug}
										</code>
										.
									</>
								) : (
									"Aparece nos comentários. Geramos um identificador único a partir desse nome."
								)}
							</p>
						</div>

						<div>
							<label
								htmlFor="register-email"
								className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
							>
								Email
							</label>
							<div className="relative">
								<span
									aria-hidden="true"
									className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
										<polyline points="22,6 12,13 2,6" />
									</svg>
								</span>
								<input
									id="register-email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									placeholder="voce@exemplo.com"
									className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="register-password"
								className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
							>
								Senha
							</label>
							<div className="relative">
								<span
									aria-hidden="true"
									className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
								</span>
								<input
									id="register-password"
									type="password"
									autoComplete="new-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={6}
									placeholder="••••••••"
									className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
								/>
							</div>
							<p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
								Mínimo 6 caracteres.
							</p>
						</div>

						<div className="flex items-start gap-2.5 pt-1">
							<input
								id="register-consent"
								type="checkbox"
								checked={acceptedTerms}
								onChange={(e) => setAcceptedTerms(e.target.checked)}
								required
								className="mt-1 h-4 w-4 rounded border-stone-300 dark:border-slate-600 text-brand focus:ring-brand"
							/>
							<label
								htmlFor="register-consent"
								className="text-sm text-stone-600 dark:text-stone-300 leading-snug"
							>
								Li e aceito a{" "}
								<Link
									href="/privacy"
									className="font-medium text-blue-700 dark:text-blue-400 underline"
									target="_blank"
								>
									Política de Privacidade
								</Link>{" "}
								e os{" "}
								<Link
									href="/terms"
									className="font-medium text-blue-700 dark:text-blue-400 underline"
									target="_blank"
								>
									Termos de Uso
								</Link>
								.
							</label>
						</div>

						<button
							type="submit"
							disabled={loading || !acceptedTerms}
							className="w-full inline-flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							{loading && (
								<svg
									className="animate-spin"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
								>
									<circle
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="3"
										strokeOpacity="0.25"
									/>
									<path
										d="M22 12a10 10 0 0 0-10-10"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
									/>
								</svg>
							)}
							{loading ? "Cadastrando..." : "Criar conta"}
						</button>
					</form>

					<p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
						Já tem conta?{" "}
						<Link
							href={
								callbackUrl
									? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
									: "/login"
							}
							className="font-medium text-blue-700 dark:text-blue-400 underline"
						>
							Entrar
						</Link>
					</p>

					<div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 text-center text-xs text-stone-500 dark:text-stone-400">
						<Link
							href="/"
							className="hover:text-stone-600 dark:hover:text-stone-300 transition"
						>
							← Voltar à página inicial
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
