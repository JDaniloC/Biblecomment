import { redirect } from "next/navigation";

type Params = { abbrev: string; chapter: string };

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { abbrev, chapter } = await params;
  redirect(`/verses/${abbrev}/${chapter}`);
}
