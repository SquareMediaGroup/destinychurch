// Server-only regulator lookups powering /governance.
//
// Destiny Church Tees Valley is registered twice over: as a charity with the
// Charity Commission for England & Wales (1119951) and as a company limited by
// guarantee at Companies House (06261423). Both regulators publish free APIs,
// and this module is the only place the site talks to either.
//
// Two rules govern everything below.
//
// 1. NEVER LOOK UP BY NAME. Several unrelated organisations are also called
//    "Destiny Church" — most dangerously "Destiny Church Trust", Scottish
//    charity SC017898, a completely different body. Quoting its income as ours
//    has happened before (see the warnings in lib/siteKnowledge.ts and
//    lib/smartSearch/tools.ts). Every request here is a direct lookup by the
//    hardcoded number, and every response is checked to confirm the number we
//    got back is the number we asked for. A mismatch is discarded, not shown.
//
// 2. NEVER THROW. Following the ChurchSuite pattern in lib/events.server.ts,
//    each fetcher returns null on any failure — missing key, timeout, non-OK
//    status, malformed payload. The page then renders from FALLBACK instead of
//    500-ing, and labels itself as showing stored rather than live data. The
//    two regulators degrade independently: a Companies House outage must not
//    blank the charity sections.
import "server-only";

/** The only two identifiers this module will ever look up. */
export const CHARITY_NUMBER = "1119951";
export const COMPANY_NUMBER = "06261423";

/**
 * Charity Commission routes are keyed by charity number *and* a subsidiary
 * suffix. "0" is the main charity; linked subsidiaries count up from 1.
 */
const CHARITY_SUFFIX = "0";

const CH_BASE = "https://api.company-information.service.gov.uk";
const CH_PUBLIC = "https://find-and-update.company-information.service.gov.uk";
const CC_BASE = "https://api.charitycommission.gov.uk/register/api";
const CC_PUBLIC =
  "https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details";

/** Weekly. Registry data changes a handful of times a year. */
const REVALIDATE = 604_800;
const TIMEOUT_MS = 15_000;

/** Public register URLs, exported so the UI can link out without rebuilding them. */
export const COMPANY_REGISTER_URL = `${CH_PUBLIC}/company/${COMPANY_NUMBER}`;
export const CHARITY_REGISTER_URL = `${CC_PUBLIC}/${CHARITY_NUMBER}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SourceState = "live" | "fallback";

export type SicCode = { code: string; description: string };
export type PreviousName = { name: string; ceasedOn: string | null };

export type CompanyProfile = {
  name: string;
  number: string;
  status: string;
  type: string;
  incorporatedOn: string | null;
  registeredOffice: string[];
  sicCodes: SicCode[];
  previousNames: PreviousName[];
  accountsNextDue: string | null;
  confirmationStatementNextDue: string | null;
};

export type Officer = {
  name: string;
  role: string;
  appointedOn: string | null;
};

export type Filing = {
  date: string | null;
  category: string;
  description: string;
  documentUrl: string | null;
};

export type CharityDetails = {
  name: string;
  number: string;
  status: string | null;
  registeredOn: string | null;
  objects: string | null;
  activities: string | null;
  areasOfOperation: string[];
  governingDocument: string | null;
};

export type FinancialYear = {
  financialYearEnd: string;
  income: number | null;
  expenditure: number | null;
};

export type AccountsSubmission = {
  financialYearEnd: string;
  annualReturnReceived: string | null;
  accountsReceived: string | null;
};

export type GovernanceData = {
  company: {
    profile: CompanyProfile;
    officers: Officer[];
    filings: Filing[];
  };
  charity: {
    details: CharityDetails;
    trustees: string[];
    financials: FinancialYear[];
    submissions: AccountsSubmission[];
  };
  sources: {
    companiesHouse: SourceState;
    charityCommission: SourceState;
  };
  /** When this data was assembled — ISO string, refreshed on each revalidation. */
  fetchedAt: string;
};

// ---------------------------------------------------------------------------
// Field access helpers
//
// Companies House response shapes are stable and well documented, so those are
// read directly. The Charity Commission's are not: its payloads have shifted
// casing between revisions (snake_case, camelCase and PascalCase all appear in
// the wild across their endpoints), and the full schema sits behind the
// developer-portal login. `field` therefore matches key names loosely —
// case-insensitively and ignoring underscores — so a casing change upstream
// degrades one field rather than the whole section.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Look up the first matching key, ignoring case and underscores. */
function field(source: unknown, ...names: string[]): unknown {
  if (!isObject(source)) return undefined;
  const normalise = (k: string) => k.toLowerCase().replace(/_/g, "");
  const wanted = names.map(normalise);
  for (const [key, value] of Object.entries(source)) {
    if (wanted.includes(normalise(key))) return value;
  }
  return undefined;
}

function str(source: unknown, ...names: string[]): string | null {
  const value = field(source, ...names);
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function num(source: unknown, ...names: string[]): number | null {
  const value = field(source, ...names);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function list(source: unknown, ...names: string[]): unknown[] {
  const value = field(source, ...names);
  return Array.isArray(value) ? value : [];
}

/** Both APIs return arrays either bare or wrapped — accept whichever arrives. */
function asArray(payload: unknown, ...wrapperKeys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const inner = field(payload, ...wrapperKeys);
  return Array.isArray(inner) ? inner : [];
}

/** Compare registration numbers ignoring leading zeros and whitespace. */
function sameNumber(a: string | null, b: string): boolean {
  if (!a) return false;
  const strip = (v: string) => v.trim().replace(/^0+/, "");
  return strip(a) === strip(b);
}

/** "confirmation-statement-with-updates" -> "Confirmation statement with updates" */
function humanise(slug: string): string {
  const words = slug.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Companies House stores officer names surname-first and shouting
 * ("HARRIS, Jonathan"). Flip to natural order and sentence-case the surname —
 * these are people's names on a church page, not database rows.
 */
function formatPersonName(raw: string): string {
  const titleCase = (part: string) =>
    part
      .toLowerCase()
      .replace(/(^|[\s'’-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

  const [surname, forenames] = raw.split(",", 2).map((p) => p.trim());
  if (!forenames || !surname) return titleCase(raw);
  return `${titleCase(forenames)} ${titleCase(surname)}`;
}

// ---------------------------------------------------------------------------
// Fetch plumbing
// ---------------------------------------------------------------------------

/**
 * One GET, weekly-cached, that resolves to null rather than throwing.
 *
 * Mirrors the guard style in lib/smartSearch/tools.ts: bail on a missing key,
 * bound the request with a timeout, treat any non-OK status as absent data.
 */
async function getJson(
  url: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) {
      console.warn(`⚠️  governance: ${res.status} from ${url}`);
      return null;
    }
    return (await res.json()) as unknown;
  } catch (error) {
    console.warn(`⚠️  governance: request failed for ${url}`, error);
    return null;
  }
}

/**
 * Companies House authenticates with HTTP Basic, using the API key as the
 * username and an empty password — not a bearer token, which is the usual
 * mistake.
 */
function companiesHouseHeaders(): Record<string, string> | null {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return null;
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
  };
}

function charityCommissionHeaders(): Record<string, string> | null {
  const key = process.env.CHARITY_COMMISSION_API_KEY;
  if (!key) return null;
  return { "Ocp-Apim-Subscription-Key": key };
}

// ---------------------------------------------------------------------------
// Companies House
// ---------------------------------------------------------------------------

// Only the codes this church actually files under. Anything else falls back to
// showing the bare code, which is still meaningful on the public register.
// Companies House returns `type` as an enum slug. Only the forms a church might
// plausibly hold are mapped; anything else falls through to `humanise`, which
// still produces something readable rather than a raw slug.
const COMPANY_TYPES: Record<string, string> = {
  "private-limited-guarant-nsc-limited-exemption":
    "Private limited company by guarantee without share capital, use of 'Limited' exemption",
  "private-limited-guarant-nsc":
    "Private limited company by guarantee without share capital",
  "private-limited-company": "Private limited company",
  "charitable-incorporated-organisation": "Charitable incorporated organisation",
};

const SIC_DESCRIPTIONS: Record<string, string> = {
  "94910": "Activities of religious organisations",
  "88990": "Other social work activities without accommodation",
  "85600": "Educational support services",
};

function parseCompanyProfile(payload: unknown): CompanyProfile | null {
  const number = str(payload, "company_number");
  const name = str(payload, "company_name");
  // The SC017898 guard, applied at the company layer.
  if (!name || !sameNumber(number, COMPANY_NUMBER)) return null;

  const office = field(payload, "registered_office_address");
  const registeredOffice = [
    str(office, "address_line_1"),
    str(office, "address_line_2"),
    str(office, "locality"),
    str(office, "region"),
    str(office, "postal_code"),
  ].filter((line): line is string => line !== null);

  const sicCodes = list(payload, "sic_codes")
    .filter((c): c is string => typeof c === "string")
    .map((code) => ({
      code,
      description: SIC_DESCRIPTIONS[code] ?? "",
    }));

  const rawType = str(payload, "type");

  const previousNames = list(payload, "previous_company_names")
    .map((entry) => ({
      name: str(entry, "name") ?? "",
      ceasedOn: str(entry, "ceased_on"),
    }))
    .filter((entry) => entry.name.length > 0);

  return {
    name,
    number: COMPANY_NUMBER,
    status: humanise(str(payload, "company_status") ?? "unknown"),
    type: rawType ? (COMPANY_TYPES[rawType] ?? humanise(rawType)) : "",
    incorporatedOn: str(payload, "date_of_creation"),
    registeredOffice,
    sicCodes,
    previousNames,
    accountsNextDue: str(field(payload, "accounts"), "next_due"),
    confirmationStatementNextDue: str(
      field(payload, "confirmation_statement"),
      "next_due",
    ),
  };
}

function parseOfficers(payload: unknown): Officer[] {
  return asArray(payload, "items")
    .map((entry) => ({
      name: formatPersonName(str(entry, "name") ?? ""),
      role: humanise(str(entry, "officer_role") ?? ""),
      appointedOn: str(entry, "appointed_on"),
      resignedOn: str(entry, "resigned_on"),
    }))
    // Current officers only — former ones are on the public register for anyone
    // who wants the full history, and listing them here reads as misleading.
    .filter((entry) => entry.name.length > 0 && entry.resignedOn === null)
    .map(({ name, role, appointedOn }) => ({ name, role, appointedOn }));
}

function parseFilings(payload: unknown): Filing[] {
  return asArray(payload, "items")
    .map((entry) => {
      const transactionId = str(entry, "transaction_id");
      const description = str(entry, "description") ?? "";
      return {
        date: str(entry, "date"),
        category: humanise(str(entry, "category") ?? ""),
        description: humanise(description),
        documentUrl: transactionId
          ? `${COMPANY_REGISTER_URL}/filing-history/${transactionId}/document?format=pdf&download=0`
          : null,
      };
    })
    .filter((entry) => entry.description.length > 0);
}

async function fetchCompaniesHouse(): Promise<GovernanceData["company"] | null> {
  const headers = companiesHouseHeaders();
  if (!headers) return null;

  const base = `${CH_BASE}/company/${COMPANY_NUMBER}`;
  const [profileRaw, officersRaw, filingsRaw] = await Promise.all([
    getJson(base, headers),
    getJson(`${base}/officers?items_per_page=50`, headers),
    getJson(`${base}/filing-history?items_per_page=10`, headers),
  ]);

  // The profile is the anchor: without a verified-identity profile we have no
  // business showing officers or filings that may belong to another entity.
  const profile = parseCompanyProfile(profileRaw);
  if (!profile) return null;

  return {
    profile,
    officers: parseOfficers(officersRaw),
    filings: parseFilings(filingsRaw),
  };
}

// ---------------------------------------------------------------------------
// Charity Commission
//
// Routes come from the Commission's published function list:
//   allcharitydetails/{RegisteredNumber}/{suffix}
//   charitytrusteenames/{RegisteredNumber}/{suffix}
//   charityfinancialhistory/{RegisteredNumber}/{suffix}   (last 5 years)
//   charityaraccounts/{RegisteredNumber}/{suffix}          (AR + accounts dates)
// ---------------------------------------------------------------------------

function parseCharityDetails(payload: unknown): CharityDetails | null {
  // allcharitydetails sometimes answers with a single object and sometimes with
  // a one-element array, depending on endpoint revision.
  const record = Array.isArray(payload) ? payload[0] : payload;
  if (!isObject(record)) return null;

  const number = str(
    record,
    "reg_charity_number",
    "charity_number",
    "registered_charity_number",
  );
  const name = str(record, "charity_name", "name");
  // The SC017898 guard, applied at the charity layer.
  if (!name || !sameNumber(number, CHARITY_NUMBER)) return null;

  const areasOfOperation = asArray(
    field(record, "area_of_operation", "areas_of_operation"),
  )
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : str(entry, "area_of_operation_name", "area_of_operation", "name"),
    )
    .filter((entry): entry is string => Boolean(entry));

  return {
    name,
    number: CHARITY_NUMBER,
    status: str(record, "reg_status", "charity_registration_status", "status"),
    registeredOn: str(record, "date_of_registration", "registration_date"),
    objects: str(record, "charity_objects", "objects"),
    activities: str(record, "charity_activities", "activities"),
    areasOfOperation: [...new Set(areasOfOperation)],
    governingDocument: str(
      record,
      "charity_governing_document",
      "governing_document_description",
    ),
  };
}

function parseTrustees(payload: unknown): string[] {
  const names = asArray(payload, "trustees", "items")
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : str(entry, "trustee_name", "name", "trustee_names"),
    )
    .filter((entry): entry is string => Boolean(entry));
  return [...new Set(names)];
}

function parseFinancials(payload: unknown): FinancialYear[] {
  return asArray(payload, "financial_history", "items")
    .map((entry) => ({
      financialYearEnd:
        str(entry, "financial_period_end_date", "financial_year_end", "period_end") ??
        "",
      income: num(entry, "income", "total_income"),
      expenditure: num(entry, "expenditure", "total_expenditure"),
    }))
    .filter((entry) => entry.financialYearEnd.length > 0)
    // Newest first.
    .sort((a, b) => b.financialYearEnd.localeCompare(a.financialYearEnd));
}

function parseSubmissions(payload: unknown): AccountsSubmission[] {
  return asArray(payload, "ar_accounts", "items")
    .map((entry) => ({
      financialYearEnd:
        str(entry, "financial_period_end_date", "financial_year_end") ?? "",
      annualReturnReceived: str(entry, "ar_received_date", "annual_return_received"),
      accountsReceived: str(entry, "accounts_received_date", "accounts_received"),
    }))
    .filter((entry) => entry.financialYearEnd.length > 0)
    .sort((a, b) => b.financialYearEnd.localeCompare(a.financialYearEnd));
}

async function fetchCharityCommission(): Promise<GovernanceData["charity"] | null> {
  const headers = charityCommissionHeaders();
  if (!headers) return null;

  const suffix = `${CHARITY_NUMBER}/${CHARITY_SUFFIX}`;
  const [detailsRaw, trusteesRaw, financialsRaw, submissionsRaw] =
    await Promise.all([
      getJson(`${CC_BASE}/allcharitydetails/${suffix}`, headers),
      getJson(`${CC_BASE}/charitytrusteenames/${suffix}`, headers),
      getJson(`${CC_BASE}/charityfinancialhistory/${suffix}`, headers),
      getJson(`${CC_BASE}/charityaraccounts/${suffix}`, headers),
    ]);

  const details = parseCharityDetails(detailsRaw);
  if (!details) return null;

  // allcharitydetails is documented as including trustees; the dedicated
  // endpoint is the fallback when it doesn't.
  const embedded = parseTrustees(field(detailsRaw, "trustees", "trustee_names"));
  const trustees = embedded.length > 0 ? embedded : parseTrustees(trusteesRaw);

  return {
    details,
    trustees,
    financials: parseFinancials(financialsRaw),
    submissions: parseSubmissions(submissionsRaw),
  };
}

// ---------------------------------------------------------------------------
// Fallback
//
// What the page shows when a key is absent or a regulator is down. Every value
// here is verified against the public register rather than estimated — where a
// figure could not be verified it is omitted, because a wrong number on a
// transparency page is worse than a missing one. The UI hides empty sections.
// ---------------------------------------------------------------------------

const FALLBACK: Pick<GovernanceData, "company" | "charity"> = {
  company: {
    profile: {
      name: "DESTINY CHURCH TEES VALLEY",
      number: COMPANY_NUMBER,
      status: "Active",
      type: "Private limited company by guarantee without share capital, use of 'Limited' exemption",
      incorporatedOn: "2007-05-29",
      registeredOffice: [
        "The Destiny Centre",
        "395 Norton Road",
        "Norton",
        "Stockton-on-Tees",
        "TS20 2QQ",
      ],
      sicCodes: [
        { code: "94910", description: "Activities of religious organisations" },
      ],
      previousNames: [
        { name: "TEESSIDE INTERNATIONAL CITY CHURCH", ceasedOn: "2009-04-30" },
      ],
      accountsNextDue: null,
      confirmationStatementNextDue: null,
    },
    officers: [],
    filings: [],
  },
  charity: {
    details: {
      name: "Destiny Church Tees Valley",
      number: CHARITY_NUMBER,
      status: null,
      registeredOn: null,
      objects: null,
      activities: null,
      areasOfOperation: [],
      governingDocument: null,
    },
    trustees: [],
    financials: [],
    submissions: [],
  },
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Everything /governance renders, in one call.
 *
 * The two regulators are fetched concurrently and fall back independently, so a
 * Companies House outage still leaves live charity data on the page (and vice
 * versa). `sources` tells the UI which halves are live so it can say so.
 */
export async function getGovernanceData(): Promise<GovernanceData> {
  const [company, charity] = await Promise.all([
    fetchCompaniesHouse(),
    fetchCharityCommission(),
  ]);

  return {
    company: company ?? FALLBACK.company,
    charity: charity ?? FALLBACK.charity,
    sources: {
      companiesHouse: company ? "live" : "fallback",
      charityCommission: charity ? "live" : "fallback",
    },
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers, shared by the /governance section components
// ---------------------------------------------------------------------------

/** "2007-05-29" -> "29 May 2007". Returns null for unparseable input. */
export function formatRegisterDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** 201000 -> "£201,000". Charity Commission reports whole pounds. */
export function formatCurrency(value: number | null): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}
