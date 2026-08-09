/**
 * Tells gt-next where the CLI writes its translation files. `npx gt translate`
 * (or `npx gt generate` without credentials) fills public/_gt/[locale].json;
 * they are generated, so they are gitignored rather than committed.
 */
export default async function loadTranslations(locale: string) {
  const translations = await import(`./public/_gt/${locale}.json`);
  return translations.default;
}
