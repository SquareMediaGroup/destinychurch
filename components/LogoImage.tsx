"use client";

import Image, { type ImageProps } from "next/image";

type LogoImageProps = ImageProps;

export default function LogoImage({ alt = "", ...props }: LogoImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
