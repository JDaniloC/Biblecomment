import type { Metadata, Viewport } from "next";
import { Inter, Lora, Merriweather } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./providers";
import PWARegister from "@/components/PWARegister";
import OfflineSyncProvider from "@/components/OfflineSyncProvider";
import { AppShellChrome } from "@/components/AppShellChrome";
import { OfflineBanner } from "@/components/OfflineBanner";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { StructuredData } from "@/components/StructuredData";

// Inter: app default sans (was inlined in 50+ places as a fontFamily
// string). Loaded once here and applied via the body className so
// inline overrides become unnecessary.
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

// Merriweather: serif used for verse quotes.
const merriweather = Merriweather({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-merriweather",
	display: "swap",
});

const lora = Lora({
	subsets: ["latin"],
	variable: "--font-lora",
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
	title: {
		default: "Bible Comment — Bíblia Comentada e Comentário Bíblico",
		template: "%s | Bible Comment",
	},
	description:
		"Bíblia comentada online: leia, comente e discuta a Palavra de Deus. 30.000+ versículos com comentários, exegese e estudos bíblicos da comunidade.",
	applicationName: "Bible Comment",
	keywords: [
		"bíblia",
		"versículo",
		"comentário",
		"exegese",
		"devocional",
		"estudo bíblico",
		"bíblia comentada",
		"comentário bíblico",
		"estudos bíblicos",
		"bible comment",
	],
	authors: [{ name: "Bible Comment" }],
	openGraph: {
		title: "Bible Comment — Bíblia Comentada e Comentário Bíblico",
		description:
			"Bíblia comentada online: leia, comente e discuta a Palavra de Deus. 30.000+ versículos com comentários, exegese e estudos bíblicos da comunidade.",
		type: "website",
		locale: "pt_BR",
		siteName: "Bible Comment",
		images: [{ url: "/screenshots/home-desktop.png", width: 1920, height: 1080 }],
	},
	twitter: {
		card: "summary_large_image",
		title: "Bible Comment — Bíblia Comentada e Comentário Bíblico",
		description:
			"Bíblia comentada online: leia, comente e discuta a Palavra de Deus. 30.000+ versículos com comentários, exegese e estudos bíblicos da comunidade.",
		images: ["/screenshots/home-desktop.png"],
	},
	robots: { index: true, follow: true },
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		title: "Bible Comment",
		statusBarStyle: "default",
	},
	icons: {
		icon: [
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				url: "/icons/icon-192-dark.png",
				sizes: "192x192",
				type: "image/png",
				media: "(prefers-color-scheme: dark)",
			},
			{
				url: "/icons/icon-512-dark.png",
				sizes: "512x512",
				type: "image/png",
				media: "(prefers-color-scheme: dark)",
			},
		],
		apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f172a" },
	],
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={`${inter.variable} ${merriweather.variable} ${lora.variable}`}
		>
			<body className="font-sans">
				{/* Anti-FOUC: apply the saved text scale before first paint so the
            global `body { zoom: var(--bc-text-scale) }` is correct on load
            instead of flashing at 100% until FontSizeControl hydrates. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `try{var s=parseFloat(localStorage.getItem('bc-text-scale'));if(s>=0.85&&s<=1.4)document.documentElement.style.setProperty('--bc-text-scale',String(s));}catch(e){}`,
					}}
				/>
				<StructuredData />
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white dark:focus:bg-slate-900 focus:text-brand focus:px-3 focus:py-2 focus:rounded focus:shadow-lg focus:outline-2 focus:outline-brand"
				>
					Pular para o conteúdo
				</a>
				<OfflineBanner />
				<SessionProvider>
					<EmailVerificationBanner />
					{children}
					<AppShellChrome />
				</SessionProvider>
				<PWARegister />
				<OfflineSyncProvider />
			</body>
		</html>
	);
}
