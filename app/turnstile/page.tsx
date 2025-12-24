import TurnstileGate from "@/components/TurnstileGate";

export const revalidate = 30;

type SearchParams = {
  from?: string | string[];
};

export default function TurnstilePage({ searchParams }: { searchParams?: SearchParams }) {
  const fromParam = searchParams?.from;
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const redirectTo = from && from.startsWith("/") ? from : "/";
  const siteKey = process.env.SITE_KEY ?? "";

  return (
    <div className="min-h-[70vh]">
      <TurnstileGate siteKey={siteKey} redirectTo={redirectTo} />
    </div>
  );
}
