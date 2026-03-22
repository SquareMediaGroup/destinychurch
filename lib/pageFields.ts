export interface PageField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface PageDef {
  label: string;
  icon: string;
  description: string;
  fields: PageField[];
}

export const PAGE_FIELDS: Record<string, PageDef> = {
  give: {
    label: "Give",
    icon: "volunteer_activism",
    description: "Bank transfer details and text-to-give information shown on the Give page.",
    fields: [
      { key: "account_name",   label: "Account Name",            placeholder: "Destiny Church Tees Valley" },
      { key: "sort_code",      label: "Sort Code",               placeholder: "08-92-99" },
      { key: "account_number", label: "Account Number",          placeholder: "67397646" },
      { key: "text_keyword",   label: "Text to Give — Keyword",  placeholder: "DCTEES" },
      { key: "text_number",    label: "Text to Give — Number",   placeholder: "07380 307 800" },
    ],
  },
  general: {
    label: "General Info",
    icon: "church",
    description: "Service times and location used across the site.",
    fields: [
      { key: "service_day",     label: "Service Day",     placeholder: "Sunday" },
      { key: "service_time",    label: "Service Time",    placeholder: "11am" },
      { key: "service_address", label: "Address",         placeholder: "Destiny Centre, Norton Road, Stockton-on-Tees" },
    ],
  },
};
