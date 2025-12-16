import type { ReactNode } from "react";

type CardGridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
};

export default function CardGrid({
  children,
  columns = 3,
  className = "",
}: CardGridProps) {
  const columnClasses: Record<typeof columns, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-6 ${columnClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}
