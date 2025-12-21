"use client";

import Image, { type ImageProps } from "next/image";

type LogoImageProps = ImageProps;

export default function LogoImage(props: LogoImageProps) {
  return (
    <Image
      {...props}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
