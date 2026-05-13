import { nanoid } from "nanoid";

// ── Identifiers ──────────────────────────────────────────────────────────────

export type NodeId = string;

export function createNodeId(): NodeId {
  return `nd_${nanoid(12)}`;
}

// ── Colors & Values ──────────────────────────────────────────────────────────

export type TokenRef = { token: string };
export type TokenOrLiteral<T> = T | TokenRef;

export type SolidColor = { type: "solid"; hex: string; opacity?: number };
export type GradientStop = { offset: number; hex: string; opacity?: number };
export type LinearGradient = {
  type: "linear";
  angle: number;
  stops: GradientStop[];
};
export type RadialGradient = {
  type: "radial";
  stops: GradientStop[];
};
export type Color = SolidColor | LinearGradient | RadialGradient | TokenRef;

export type Shadow = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity?: number;
  inset?: boolean;
};

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

// ── Layout ───────────────────────────────────────────────────────────────────

export type LayoutMode = "absolute" | "stack" | "grid";
export type SizeValue = number | "auto" | "fill" | `${number}%` | `${number}fr`;
export type ConstraintAxis = "fix" | "scale" | "min" | "max";

export type NodeLayout = {
  mode: LayoutMode;
  x?: number;
  y?: number;
  w?: SizeValue;
  h?: SizeValue;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  rotation?: number;
  constraints?: {
    left?: ConstraintAxis;
    right?: ConstraintAxis;
    top?: ConstraintAxis;
    bottom?: ConstraintAxis;
  };
  direction?: "row" | "col";
  gap?: number;
  rowGap?: number;
  colGap?: number;
  padding?: [number, number, number, number]; // t r b l
  columns?: number;
  rows?: number;
  wrap?: boolean;
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  justifyContent?:
    | "start"
    | "center"
    | "end"
    | "between"
    | "around"
    | "evenly";
  alignSelf?: "start" | "center" | "end" | "stretch";
  grow?: number;
  shrink?: number;
  order?: number;
  zIndex?: number;
};

// ── Typography ───────────────────────────────────────────────────────────────

export type FontStyle = {
  family?: TokenOrLiteral<string>;
  size?: number;
  weight?: number;
  lineHeight?: number | string;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle?: "normal" | "italic";
};

// ── Style ────────────────────────────────────────────────────────────────────

export type NodeStyle = {
  fill?: Color;
  stroke?: Color;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  radius?: number | [number, number, number, number];
  shadow?: Shadow[];
  innerShadow?: Shadow[];
  blur?: number;
  backgroundBlur?: number;
  opacity?: number;
  mixBlendMode?: string;
  font?: FontStyle;
  color?: Color;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  cursor?: string;
  transition?: string;
  backdropFilter?: string;
};

// ── Animation ────────────────────────────────────────────────────────────────

export type EasingPreset =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | `cubic-bezier(${string})`;

export type AppearAnimation = {
  type:
    | "fade-in"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "scale-up"
    | "scale-down"
    | "blur-in"
    | "none";
  duration?: number;
  delay?: number;
  easing?: EasingPreset;
  distance?: number;
};

export type ScrollAnimation = {
  type: "parallax" | "fade" | "scale" | "rotate" | "progress";
  speed?: number;
  range?: [number, number];
};

export type HoverAnimation = {
  scale?: number;
  rotate?: number;
  translateY?: number;
  opacity?: number;
  shadow?: Shadow;
  duration?: number;
  easing?: EasingPreset;
};

export type NodeAnimation = {
  appear?: AppearAnimation;
  scroll?: ScrollAnimation;
  hover?: HoverAnimation;
  transition?: { duration: number; easing: EasingPreset };
};

// ── Icons ────────────────────────────────────────────────────────────────────

export type PhosphorWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone";

export type IconRef = {
  lib: "material" | "phosphor";
  name: string;
  weight?: PhosphorWeight;
  filled?: boolean;
  size?: number;
  color?: Color;
};

// ── Node ─────────────────────────────────────────────────────────────────────

export type NodeType =
  | "frame"
  | "text"
  | "heading"
  | "image"
  | "video"
  | "icon"
  | "button"
  | "card"
  | "spacer"
  | "divider"
  | "input"
  | "form"
  | "nav"
  | "link"
  | "embed"
  | "code"
  | "richtext"
  | "component-instance";

export type TextProps = {
  content: string;
  htmlTag?: "p" | "span" | "blockquote" | "label";
};

export type HeadingProps = {
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
};

export type ImageProps = {
  src: string;
  alt?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  objectPosition?: string;
};

export type VideoProps = {
  src?: string;
  youtubeId?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
};

export type ButtonProps = {
  label: string;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  icon?: IconRef;
  iconPosition?: "left" | "right";
  openInNewTab?: boolean;
};

export type IconNodeProps = {
  icon: IconRef;
};

export type CardProps = {
  variant?: "default" | "outlined" | "elevated" | "glass";
};

export type SpacerProps = {
  size: number;
};

export type InputProps = {
  placeholder?: string;
  type?: "text" | "email" | "tel" | "textarea" | "number";
  label?: string;
  required?: boolean;
  name?: string;
};

export type FormProps = {
  action?: string;
  method?: "POST" | "GET";
  successMessage?: string;
};

export type NavProps = {
  items: Array<{
    label: string;
    href: string;
    children?: Array<{ label: string; href: string }>;
  }>;
  logo?: ImageProps;
  sticky?: boolean;
};

export type EmbedProps = {
  html?: string;
  src?: string;
  aspectRatio?: string;
};

export type CodeProps = {
  code: string;
  language?: string;
};

export type RichTextProps = {
  html: string;
};

export type ComponentInstanceProps = {
  componentId: string;
  overrides: Record<string, unknown>;
};

export type NodeProps =
  | ({ _type: "text" } & TextProps)
  | ({ _type: "heading" } & HeadingProps)
  | ({ _type: "image" } & ImageProps)
  | ({ _type: "video" } & VideoProps)
  | ({ _type: "button" } & ButtonProps)
  | ({ _type: "icon" } & IconNodeProps)
  | ({ _type: "card" } & CardProps)
  | ({ _type: "spacer" } & SpacerProps)
  | ({ _type: "input" } & InputProps)
  | ({ _type: "form" } & FormProps)
  | ({ _type: "nav" } & NavProps)
  | ({ _type: "embed" } & EmbedProps)
  | ({ _type: "code" } & CodeProps)
  | ({ _type: "richtext" } & RichTextProps)
  | ({ _type: "component-instance" } & ComponentInstanceProps)
  | ({ _type: "frame" | "divider" | "link" } & Record<string, unknown>);

export type StudioNode = {
  id: NodeId;
  type: NodeType;
  name?: string;
  locked?: boolean;
  hidden?: boolean;
  layout: NodeLayout;
  style: NodeStyle;
  responsive?: Partial<Record<Breakpoint, { layout?: Partial<NodeLayout>; style?: Partial<NodeStyle> }>>;
  states?: {
    hover?: { style?: Partial<NodeStyle>; layout?: Partial<NodeLayout> };
    pressed?: { style?: Partial<NodeStyle> };
    focused?: { style?: Partial<NodeStyle> };
  };
  animation?: NodeAnimation;
  children?: NodeId[];
  props: NodeProps;
};

// ── Component Definition ─────────────────────────────────────────────────────

export type SlotType = "text" | "heading" | "image" | "video" | "button" | "icon" | "frame" | "any";

export type SlotDefinition = {
  type: SlotType;
  label: string;
  required?: boolean;
  defaultNodeId?: NodeId;
};

export type ComponentDefinition = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  slots: Record<string, SlotDefinition>;
  defaultNodes: Record<NodeId, StudioNode>;
  rootNodeId: NodeId;
  thumbnail?: string;
};

// ── Asset ────────────────────────────────────────────────────────────────────

export type AssetKind = "image" | "video" | "font" | "svg" | "lottie";

export type AssetRef = {
  id: string;
  kind: AssetKind;
  url: string;
  name?: string;
  width?: number;
  height?: number;
  mime?: string;
  size?: number;
};

// ── Document (the root) ──────────────────────────────────────────────────────

export type TokenValue = string | number;

export type TokenCategory = "color" | "font" | "fontSize" | "spacing" | "radius" | "shadow" | "lineHeight" | "fontWeight";

export type TokenEntry = {
  value: TokenValue;
  category: TokenCategory;
  label?: string;
};

export type TokenSet = Record<string, TokenEntry>;

export type StudioDocument = {
  version: 2;
  pageId: string;
  root: NodeId;
  nodes: Record<NodeId, StudioNode>;
  tokens: TokenSet;
  breakpoints: Array<{ id: Breakpoint; label: string; minWidth: number }>;
  components: Record<string, ComponentDefinition>;
  assets: Record<string, AssetRef>;
};

// ── Factory helpers ──────────────────────────────────────────────────────────

export function createNode(
  type: NodeType,
  props: NodeProps,
  overrides?: Partial<Omit<StudioNode, "id" | "type" | "props">>
): StudioNode {
  return {
    id: createNodeId(),
    type,
    layout: { mode: "stack", w: "fill", h: "auto", ...overrides?.layout },
    style: { ...overrides?.style },
    props,
    children: overrides?.children,
    name: overrides?.name,
  };
}

export function createDocument(pageId: string): StudioDocument {
  const rootId = createNodeId();
  return {
    version: 2,
    pageId,
    root: rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        type: "frame",
        name: "Page",
        layout: {
          mode: "stack",
          direction: "col",
          w: "fill",
          h: "auto",
          gap: 0,
          padding: [0, 0, 0, 0],
        },
        style: {
          fill: { type: "solid", hex: "#ffffff" },
        },
        props: { _type: "frame" },
        children: [],
      },
    },
    tokens: {},
    breakpoints: [
      { id: "base", label: "Mobile", minWidth: 0 },
      { id: "sm", label: "Small", minWidth: 640 },
      { id: "md", label: "Tablet", minWidth: 768 },
      { id: "lg", label: "Desktop", minWidth: 1024 },
      { id: "xl", label: "Wide", minWidth: 1280 },
      { id: "2xl", label: "Ultra-wide", minWidth: 1536 },
    ],
    components: {},
    assets: {},
  };
}
