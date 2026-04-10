"use client";

import { createContext, useContext, useState } from "react";

interface SermonSearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

const SermonSearchContext = createContext<SermonSearchContextValue>({
  query: "",
  setQuery: () => {},
});

export function SermonSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <SermonSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SermonSearchContext.Provider>
  );
}

export function useSermonSearch() {
  return useContext(SermonSearchContext);
}
