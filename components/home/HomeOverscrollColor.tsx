/**
 * The colour a phone reveals behind the page on iOS Safari's rubber-band
 * overscroll — only ever relevant on the homepage, whose hero and footer are
 * dark enough that the default white `html` background would flash oddly
 * during a bounce.
 *
 * This used to be a client component that set
 * `document.documentElement.style.background` in a `useEffect` — necessarily
 * client-only, so it ran after hydration and after the default white
 * background had already painted once. It also duplicated the brand orange
 * as a bare hex (`#F58021`) rather than the token.
 *
 * A server-rendered `<style>` tag has neither problem: it's part of the HTML
 * response, so `html`'s background is correct from the very first paint, and
 * it references the real token. Scoping is automatic too — this only
 * renders while HomePageBody does, so navigating away removes the tag and
 * `html`'s background reverts to globals.css's own `background: #ffffff`
 * with no cleanup code required.
 */
export default function HomeOverscrollColor() {
  return (
    <style>{`html { background: var(--color-destiny-orange); }`}</style>
  );
}
