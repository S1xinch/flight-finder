import type { Metadata } from "next";
import Results from "@/components/Results";
import SearchForm from "@/components/SearchForm";

export const metadata: Metadata = { title: "Flight results", robots: { index: false } };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="wrap grid gap-6">
      <h1>Flight results</h1>
      <SearchForm defaults={sp} />
      <Results params={sp} />
    </div>
  );
}
