"use client";

// The admin notification bell: a badge showing what's unread, and a dropdown
// of the most recent notifications for whatever roles the signed-in admin
// holds. Data and Realtime delivery both come from lib/useNotifications.ts.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/audit";
import { useAdminSession } from "@/lib/useAdminSession";
import { useNotifications, type NotificationItem } from "@/lib/useNotifications";

export function AdminNotificationBell({ className = "" }: { className?: string }) {
  const { roles } = useAdminSession();
  const { items, unreadCount, markRead, markAllRead } = useNotifications(roles);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) await markRead(item.id);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-destiny-grey/45 transition hover:text-destiny-grey dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/45 dark:hover:text-white"
      >
        <span className="material-symbols-rounded text-lg" aria-hidden="true">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destiny-orange px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-destiny-grey-800">
          <div className="flex items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/8">
            <span className="text-sm font-bold text-destiny-grey dark:text-white">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-bold text-destiny-orange transition hover:text-destiny-orange/80"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-destiny-grey/45 dark:text-white/45">
                Nothing yet.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => void openItem(item)}
                      className="flex items-start gap-3 border-b border-black/5 px-4 py-3 transition last:border-0 hover:bg-[#f5f7fa] dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.read ? "bg-transparent" : "bg-destiny-orange"
                        }`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm ${
                            item.read
                              ? "text-destiny-grey/65 dark:text-white/65"
                              : "font-bold text-destiny-grey dark:text-white"
                          }`}
                        >
                          {item.summary}
                        </span>
                        <span className="block text-xs text-destiny-grey/40 dark:text-white/40">
                          {relativeTime(item.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
