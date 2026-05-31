import AdministrationSidebar from "@/components/administration/AdministrationSidebar";

export const metadata = {
  title: "Administration",
};

export default function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fa] md:flex-row">
      <AdministrationSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
