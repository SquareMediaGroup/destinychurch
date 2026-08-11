import ShopDiagnostics from "@/components/shop/ShopDiagnostics";

// Section layout for the storefront. Currently exists only to mount the
// TEMPORARY blank-page diagnostic across every /shop route — the index, product
// pages, cart and checkout — since the bug has been reported on the section as a
// whole, not just the index.
//
// Remove ShopDiagnostics (and this layout, if nothing else has been added to it)
// once the blank-page cause is confirmed.
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ShopDiagnostics />
    </>
  );
}
