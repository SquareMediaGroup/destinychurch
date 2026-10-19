import { AutoRefresh } from "./AutoRefresh";
import { activeNotices, recentResolved, type Notice } from "@/lib/notices";
import { getStatus, type ComponentStatus, type ServiceStatus } from "@/lib/status";
import type { Level } from "@/lib/checks";

// Checks run on the server at most once a minute; everyone in between gets the
// cached page. If a refresh ever fails, Vercel keeps serving the last good one.
export const revalidate = 60;

const HEADLINE: Record<Level, string> = {
  operational: "All systems operational",
  degraded: "Some systems are running slowly",
  down: "Some systems are having problems",
  unknown: "Checking systems",
};

const LABEL: Record<Level, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Outage",
  unknown: "Not checked",
};

const NOTICE_LABEL: Record<Notice["kind"], string> = {
  outage: "Outage",
  degraded: "Degraded",
  maintenance: "Maintenance",
};

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

export default async function StatusPage() {
  const report = await getStatus();
  const active = activeNotices();
  const resolved = recentResolved();

  return (
    <main className="page">
      <AutoRefresh />
      <header className="masthead">
        <p className="brand">Destiny Church</p>
        <h1>System status</h1>
      </header>

      <section className={`banner level-${report.level}`} aria-live="polite">
        <span className="dot" aria-hidden />
        <div>
          <p className="banner-title">{HEADLINE[report.level]}</p>
          <p className="muted">Checked {formatTime(report.checkedAt)} (UK time). This page updates every minute.</p>
        </div>
      </section>

      {active.length > 0 && (
        <section className="notices" aria-label="Current notices">
          {active.map((n) => (
            <NoticeCard key={n.title + n.startedAt} notice={n} />
          ))}
        </section>
      )}

      {report.services.map((s) => (
        <Service key={s.id} service={s} />
      ))}

      {resolved.length > 0 && (
        <section className="card">
          <h2 className="card-title">Past notices</h2>
          {resolved.map((n) => (
            <NoticeCard key={n.title + n.startedAt} notice={n} />
          ))}
        </section>
      )}

      <footer className="footer muted small">
        <p>
          Something not working that shows as operational here? Email{" "}
          <a className="link" href="mailto:admin@destinytees.uk">
            admin@destinytees.uk
          </a>
          .
        </p>
        <p>
          <a className="link" href="https://destinytees.uk">
            destinytees.uk
          </a>
        </p>
      </footer>
    </main>
  );
}

function Service({ service }: { service: ServiceStatus }) {
  return (
    <section className="card" aria-labelledby={`svc-${service.id}`}>
      <div className="card-head">
        <h2 id={`svc-${service.id}`} className="card-title">
          {service.name}
        </h2>
        <StatusLabel level={service.level} />
      </div>
      <ul className="rows">
        {service.components.map((c) => (
          <ComponentRow key={c.id} component={c} />
        ))}
      </ul>
    </section>
  );
}

function ComponentRow({ component }: { component: ComponentStatus }) {
  return (
    <li className="row">
      <div>
        <p className="row-name">{component.name}</p>
        <p className="muted small">{component.detail ?? component.description}</p>
      </div>
      <StatusLabel level={component.level} />
    </li>
  );
}

function StatusLabel({ level }: { level: Level }) {
  return (
    <span className={`label level-${level}`}>
      <span className="dot" aria-hidden />
      {LABEL[level]}
    </span>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  const level: Level = notice.resolvedAt ? "operational" : notice.kind === "outage" ? "down" : "degraded";
  return (
    <article className={`notice level-${level}`}>
      <p className="notice-kind small">
        {notice.resolvedAt ? "Resolved" : NOTICE_LABEL[notice.kind]} · {formatTime(notice.startedAt)}
        {notice.resolvedAt && ` to ${formatTime(notice.resolvedAt)}`}
      </p>
      <p className="notice-title">{notice.title}</p>
      <p className="muted">{notice.body}</p>
    </article>
  );
}
