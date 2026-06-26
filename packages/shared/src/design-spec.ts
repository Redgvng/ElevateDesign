import { z } from "zod";

export const DeviceTypeSchema = z.enum(["mobile", "tablet", "desktop", "agnostic"]);

export const LayoutSpecSchema = z.object({
  position: z.enum(["relative", "absolute"]),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.union([z.number().positive(), z.enum(["fill", "hug"])]),
  height: z.union([z.number().positive(), z.enum(["fill", "hug"])]),
  direction: z.enum(["row", "column"]).optional(),
  gap: z.number().nonnegative().optional(),
  padding: z
    .object({
      top: z.number().nonnegative(),
      right: z.number().nonnegative(),
      bottom: z.number().nonnegative(),
      left: z.number().nonnegative(),
    })
    .optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "between"]).optional(),
});

export const StyleSpecSchema = z.object({
  background: z.string().optional(),
  foreground: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().nonnegative().optional(),
  radius: z.number().nonnegative().optional(),
  shadow: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  typography: z
    .object({
      token: z.string().optional(),
      fontFamily: z.string().optional(),
      fontSize: z.number().positive().optional(),
      fontWeight: z.number().positive().optional(),
      lineHeight: z.number().positive().optional(),
    })
    .optional(),
});

export const ContentSpecSchema = z.object({
  text: z.string().optional(),
  inputHint: z.string().optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  icon: z.string().optional(),
  chart: z
    .object({
      type: z.enum(["line", "bar", "area", "pie"]),
      data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    })
    .optional(),
});

export type DesignNode = {
  id: string;
  type:
    | "frame"
    | "stack"
    | "text"
    | "button"
    | "input"
    | "image"
    | "card"
    | "chart"
    | "table"
    | "nav"
    | "icon"
    | "custom";
  name: string;
  layout: z.infer<typeof LayoutSpecSchema>;
  style: z.infer<typeof StyleSpecSchema>;
  content: z.infer<typeof ContentSpecSchema>;
  children: DesignNode[];
};

export const DesignNodeSchema: z.ZodType<DesignNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum([
      "frame",
      "stack",
      "text",
      "button",
      "input",
      "image",
      "card",
      "chart",
      "table",
      "nav",
      "icon",
      "custom",
    ]),
    name: z.string().min(1),
    layout: LayoutSpecSchema,
    style: StyleSpecSchema,
    content: ContentSpecSchema,
    children: z.array(DesignNodeSchema),
  }),
);

export const DesignSpecSchema = z.object({
  schemaVersion: z.literal("1.0"),
  title: z.string().min(1),
  deviceType: DeviceTypeSchema,
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  themeRefs: z.object({
    designSystemId: z.string().nullable(),
  }),
  /** Optional trace of UI module ids that informed this composition (Phase 4.5). */
  moduleRefs: z.array(z.string()).optional(),
  root: DesignNodeSchema,
  interactions: z.array(z.unknown()),
  assets: z.array(z.unknown()),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
