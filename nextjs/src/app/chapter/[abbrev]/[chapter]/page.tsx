import { redirect } from "next/navigation";

type Params = { abbrev: string; chapter: string };
type SearchParams = Record<string, string | string[] | undefined>;

// /chapter/[abbrev]/[chapter] is an alias for /verses/[abbrev]/[number].
// We preserve query params (notably ?tour=1) so deep links into the
// onboarding flow keep working through the redirect.
export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { abbrev, chapter } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  const tail = qs.toString();
  redirect(`/verses/${abbrev}/${chapter}${tail ? `?${tail}` : ""}`);
}
