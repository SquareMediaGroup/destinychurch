export default function SkipToMainLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </a>
  );
}