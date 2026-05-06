import type { BuilderElement } from "@/lib/builder/types";
import ElementRenderer from "./ElementRenderer";

type Props = {
  layout: BuilderElement[];
};

export default function BuilderPageRenderer({ layout }: Props) {
  if (!layout || layout.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-destiny-grey/50">
        <p className="text-sm">This page is empty.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {layout.map((el) => (
        <ElementRenderer key={el.id} element={el} editing={false} />
      ))}
    </div>
  );
}
