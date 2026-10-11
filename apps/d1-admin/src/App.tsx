// The window: sign-in screens, or the three-pane app from the design
// (sidebar, main pane, group info).

import { useEffect, type ReactElement } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { Empty } from "@/components/ui";
import { useLive } from "@/lib/live";
import { useNav, type AdminPage } from "@/lib/nav";
import { usePrefs } from "@/lib/prefs";
import { useReady, useSession } from "@/lib/session";
import { AppSettings } from "@/features/admin/AppSettings";
import { Audit } from "@/features/admin/Audit";
import { Communities } from "@/features/admin/Communities";
import { Feedback } from "@/features/admin/Feedback";
import { Invites } from "@/features/admin/Invites";
import { Paused } from "@/features/admin/Paused";
import { People } from "@/features/admin/People";
import { Reports } from "@/features/admin/Reports";
import { Requests } from "@/features/admin/Requests";
import { Locked } from "@/features/auth/Locked";
import { NotAllowed } from "@/features/auth/NotAllowed";
import { SignIn } from "@/features/auth/SignIn";
import { Conversation, NoChat } from "@/features/chat/Conversation";
import { Inspector } from "@/features/chat/Inspector";
import { SearchResults } from "@/features/chat/SearchResults";
import { Sheets } from "@/features/sheets/Sheets";

const PAGES: Record<AdminPage, { el: () => ReactElement; role: "safeguarding" | "d1" }> = {
  reports: { el: Reports, role: "safeguarding" },
  paused: { el: Paused, role: "safeguarding" },
  audit: { el: Audit, role: "safeguarding" },
  requests: { el: Requests, role: "d1" },
  people: { el: People, role: "d1" },
  invites: { el: Invites, role: "d1" },
  communities: { el: Communities, role: "d1" },
  feedback: { el: Feedback, role: "d1" },
  settings: { el: AppSettings, role: "d1" },
};

function Shell() {
  useLive();
  const { roles } = useReady();
  const { view, query, infoOpen } = useNav();
  const searching = query.trim().length > 0;

  let main: ReactElement;
  if (searching) main = <SearchResults query={query} />;
  else if (view.kind === "admin") {
    const page = PAGES[view.page];
    const allowed = page.role === "safeguarding" ? roles.safeguardingAdmin : roles.destinyOneAdmin;
    const Page = page.el;
    main = allowed ? <Page /> : <Empty title="Not available" sub="Your role doesn't include this page." />;
  } else if (view.groupId) main = <Conversation key={view.groupId} groupId={view.groupId} />;
  else main = <NoChat />;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)", minHeight: 0 }}>
        <ErrorBoundary resetKey={searching ? `search:${query}` : JSON.stringify(view)}>{main}</ErrorBoundary>
      </main>
      {!searching && view.kind === "chat" && view.groupId && infoOpen && <Inspector groupId={view.groupId} />}
      <Sheets />
    </div>
  );
}

export function App() {
  const { state } = useSession();
  const { theme } = usePrefs();
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  switch (state.status) {
    case "loading":
      return <div className="drag" data-tauri-drag-region style={{ height: "100%", background: "var(--grouped)" }} />;
    case "signedOut":
      return <SignIn />;
    case "locked":
      return <Locked />;
    case "notAllowed":
      return <NotAllowed message={state.message} />;
    case "ready":
      return <Shell />;
  }
}
