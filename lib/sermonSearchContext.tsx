"use client";

import { createContext, useContext, useState } from "react";

interface SermonSearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  titles: string[];
  setTitles: (t: string[]) => void;
}

const SermonSearchContext = createContext<SermonSearchContextValue>({
  query: "",
  setQuery: () => {},
  titles: [],
  setTitles: () => {},
});

export function SermonSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  return (
    <SermonSearchContext.Provider value={{ query, setQuery, titles, setTitles }}>
      {children}
    </SermonSearchContext.Provider>
  );
}

export function useSermonSearch() {
  return useContext(SermonSearchContext);
}
