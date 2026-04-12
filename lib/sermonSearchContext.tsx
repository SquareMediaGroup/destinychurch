"use client";

import { createContext, useContext, useState } from "react";

export interface SermonSuggestion {
  id: string;
  title: string;
}

interface SermonSearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  suggestions: SermonSuggestion[];
  setSuggestions: (s: SermonSuggestion[]) => void;
}

const SermonSearchContext = createContext<SermonSearchContextValue>({
  query: "",
  setQuery: () => {},
  suggestions: [],
  setSuggestions: () => {},
});

export function SermonSearchProvider({
  children,
  initialSuggestions = [],
}: {
  children: React.ReactNode;
  initialSuggestions?: SermonSuggestion[];
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SermonSuggestion[]>(initialSuggestions);
  return (
    <SermonSearchContext.Provider value={{ query, setQuery, suggestions, setSuggestions }}>
      {children}
    </SermonSearchContext.Provider>
  );
}

export function useSermonSearch() {
  return useContext(SermonSearchContext);
}
