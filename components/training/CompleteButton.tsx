"use client";

import { useEffect, useState } from "react";
import { useCompletedSet, toggleCompleted } from "./useTrainingProgress";

export default function CompleteButton({ 
  postId, 
  minReadSeconds = 0 
}: { 
  postId: string;
  minReadSeconds?: number;
}) {
  const completed = useCompletedSet();
  const done = completed.has(postId);
  
  const [token, setToken] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(minReadSeconds);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // If there's a required read time, start the timer.
  useEffect(() => {
    if (done || minReadSeconds <= 0) return;
    
    let isMounted = true;
    
    fetch(`/api/training/posts/${postId}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" })
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.token) {
          setToken(data.token);
          setRemaining(minReadSeconds);
        }
      })
      .catch(() => {});
      
    return () => { isMounted = false; };
  }, [postId, minReadSeconds, done]);

  // Countdown
  useEffect(() => {
    if (done || remaining <= 0 || !token) return;
    
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [remaining, done, token]);

  async function handleToggle() {
    if (done) {
      // Allow instant un-checking without verification
      toggleCompleted(postId, false);
      return;
    }

    if (minReadSeconds > 0) {
      if (!token) return; // Still initializing
      if (remaining > 0) return; // Too early
      
      setLoading(true);
      setError("");
      
      const res = await fetch(`/api/training/posts/${postId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "verify", 
          token, 
          minReadSeconds 
        })
      });
      
      setLoading(false);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not verify reading time.");
        if (data.remaining) setRemaining(data.remaining);
        return;
      }
    }
    
    toggleCompleted(postId, true);
  }

  const disabled = (!done && minReadSeconds > 0 && remaining > 0) || loading;

  return (
    <div className="mt-12 flex flex-col items-center border-t border-black/5 pt-8">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold transition ${
          done
            ? "bg-destiny-green/10 text-destiny-green hover:bg-destiny-green/15"
            : disabled
            ? "bg-black/5 text-destiny-grey/30 cursor-not-allowed"
            : "bg-destiny-orange text-white shadow-lg shadow-destiny-orange/30 hover:brightness-110"
        }`}
      >
        <span className="material-symbols-rounded text-xl">
          {done ? "check_circle" : disabled ? "hourglass_top" : "radio_button_unchecked"}
        </span>
        {done 
          ? "Completed" 
          : loading
          ? "Verifying..."
          : disabled 
          ? `Read for ${remaining}s more to complete` 
          : "Mark as completed"}
      </button>
      
      {error && (
        <p className="mt-3 text-xs font-medium text-destiny-red">{error}</p>
      )}
      
      {done && (
        <p className="mt-2 text-xs text-destiny-grey/45">Tap again to undo.</p>
      )}
    </div>
  );
}
