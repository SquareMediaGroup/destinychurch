"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SermonPlayerState {
  isPlaying: boolean;
  setPlaying: (playing: boolean) => void;
}

const SermonPlayerContext = createContext<SermonPlayerState>({
  isPlaying: false,
  setPlaying: () => {},
});

export function SermonPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const setPlaying = useCallback((v: boolean) => setIsPlaying(v), []);
  return (
    <SermonPlayerContext.Provider value={{ isPlaying, setPlaying }}>
      {children}
    </SermonPlayerContext.Provider>
  );
}

export function useSermonPlayerState() {
  return useContext(SermonPlayerContext);
}
