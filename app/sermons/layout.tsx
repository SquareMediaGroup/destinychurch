export default function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 lg:px-8">
      {children}
    </div>
  );
}
