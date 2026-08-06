import AnimateIn from "@/components/AnimateIn";
import {
  CHARITY_REGISTER_URL,
  COMPANY_REGISTER_URL,
  formatRegisterDate,
  type CharityDetails,
  type CompanyProfile,
} from "@/lib/governance.server";

type Row = { label: string; value: string };

function Card({
  icon,
  title,
  number,
  numberLabel,
  rows,
  href,
  linkLabel,
  delay,
}: {
  icon: string;
  title: string;
  number: string;
  numberLabel: string;
  rows: Row[];
  href: string;
  linkLabel: string;
  delay: number;
}) {
  return (
    <AnimateIn delay={delay}>
      <div className="flex h-full flex-col rounded-3xl bg-[#f5f7fa] p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-rounded text-2xl text-destiny-orange">
            {icon}
          </span>
          <h3 className="text-2xl font-black text-destiny-grey">{title}</h3>
        </div>

        <div className="mb-6">
          <p className="text-4xl font-black text-destiny-grey">{number}</p>
          <p className="text-sm text-destiny-grey/50">{numberLabel}</p>
        </div>

        <dl className="mb-6 space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="border-t border-black/6 pt-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-destiny-grey/40">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm text-destiny-grey/80">{row.value}</dd>
            </div>
          ))}
        </dl>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-destiny-orange underline underline-offset-4 transition hover:text-destiny-orange-dark"
        >
          {linkLabel}
          <span className="material-symbols-rounded text-base" aria-hidden="true">
            open_in_new
          </span>
        </a>
      </div>
    </AnimateIn>
  );
}

export default function RegistrationCards({
  profile,
  details,
}: {
  profile: CompanyProfile;
  details: CharityDetails;
}) {
  const charityRows: Row[] = [
    { label: "Registered name", value: details.name },
    ...(details.status ? [{ label: "Status", value: details.status }] : []),
    ...(formatRegisterDate(details.registeredOn)
      ? [
          {
            label: "Registered on",
            value: formatRegisterDate(details.registeredOn) as string,
          },
        ]
      : []),
    ...(details.governingDocument
      ? [{ label: "Governing document", value: details.governingDocument }]
      : []),
    { label: "Regulator", value: "Charity Commission for England and Wales" },
  ];

  const companyRows: Row[] = [
    { label: "Registered name", value: profile.name },
    { label: "Status", value: profile.status },
    ...(profile.type ? [{ label: "Company type", value: profile.type }] : []),
    ...(formatRegisterDate(profile.incorporatedOn)
      ? [
          {
            label: "Incorporated on",
            value: formatRegisterDate(profile.incorporatedOn) as string,
          },
        ]
      : []),
    ...(profile.registeredOffice.length > 0
      ? [
          {
            label: "Registered office",
            value: profile.registeredOffice.join(", "),
          },
        ]
      : []),
    ...(profile.sicCodes.length > 0
      ? [
          {
            label: "Nature of business",
            value: profile.sicCodes
              .map((sic) =>
                sic.description ? `${sic.code} — ${sic.description}` : sic.code,
              )
              .join("; "),
          },
        ]
      : []),
    ...(profile.previousNames.length > 0
      ? [
          {
            label: "Previously known as",
            value: profile.previousNames.map((n) => n.name).join("; "),
          },
        ]
      : []),
  ];

  return (
    <section className="bg-white pb-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card
            icon="volunteer_activism"
            title="Registered charity"
            number={details.number}
            numberLabel="Charity number (England and Wales)"
            rows={charityRows}
            href={CHARITY_REGISTER_URL}
            linkLabel="View on the Charity Commission register"
            delay={100}
          />
          <Card
            icon="corporate_fare"
            title="Registered company"
            number={profile.number}
            numberLabel="Company number"
            rows={companyRows}
            href={COMPANY_REGISTER_URL}
            linkLabel="View on Companies House"
            delay={200}
          />
        </div>
      </div>
    </section>
  );
}
