import type { Metadata } from "next";
import { HelpClient } from "./HelpClient";

export const metadata: Metadata = {
	title: "Central de Ajuda — Bible Comment",
	description:
		"Tire dúvidas, confira atalhos de teclado, conheça os tipos de comentário e acerte o passo com tutoriais interativos no Bible Comment.",
};

export default function HelpPage() {
	return <HelpClient />;
}
