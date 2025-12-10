import localFont from "next/font/local";

const materialSymbols = localFont({
  src: [
    { path: "../public/fonts/material-symbols-rounded-400.ttf", weight: "400" },
    { path: "../public/fonts/material-symbols-rounded-500.ttf", weight: "500" },
  ],
  variable: "--font-icons",
  display: "block",
  preload: true,
});

type IconProps = {
  name: string;
  size?: number;
  className?: string;
  label?: string;
};

export default function Icon({
  name,
  size = 20,
  className = "",
  label,
}: IconProps) {
  const classes = [
    materialSymbols.className,
    "inline-flex items-center justify-center align-middle leading-none select-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: '"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24',
      }}
    >
      {name}
    </span>
  );
}
