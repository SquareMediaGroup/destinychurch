"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SermonSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/sermons?q=${encodeURIComponent(query.trim())}` : "/sermons");
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <span className="material-symbols-rounded pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-white/30">
        search
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sermons..."
        className="w-full rounded-full border border-white/10 bg-[#1e1e1e] py-3 pl-11 pr-5 text-sm text-white shadow-sm placeholder:text-white/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
      />
    </form>
  );
}
