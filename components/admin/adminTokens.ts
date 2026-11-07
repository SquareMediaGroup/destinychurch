// AdminUI.tsx's class tokens, in a module of their own so code outside the
// admin (the site-wide DialogProvider) can use them without pulling in
// AdminUI.tsx and, through it, the whole motion library. AdminUI re-exports
// them, so admin code keeps importing from there.

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white dark:placeholder:text-white/25";

export const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] disabled:opacity-60 dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/70 dark:hover:bg-white/5";

export const dangerBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-red px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

/** Square icon-only button for row actions. */
export const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-orange dark:text-white/40 dark:hover:bg-white/10";

export const cardClass =
  "rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800";
