import TurnstileGate from "@/components/TurnstileGate";

export const revalidate = 30;

type SearchParams = {
  from?: string | string[];
};

type SearchParamsLike =
  | URLSearchParams
  | SearchParams
  | null
  | undefined;

export default async function TurnstilePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsLike> | SearchParamsLike;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const fromParam =
    resolvedSearchParams instanceof URLSearchParams
      ? resolvedSearchParams.get("from") ?? undefined
      : resolvedSearchParams?.from;
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const redirectTo = from && from.startsWith("/") ? from : "/";
  const siteKey = process.env.SITE_KEY ?? "";

  return (
    <div className="min-h-[70vh]">
      <TurnstileGate siteKey={siteKey} redirectTo={redirectTo} />
    </div>
  );
}
