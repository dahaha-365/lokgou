import { z } from "zod";
import { EnableStateSchema, PaginationSchema } from "./common";

const PositiveIntegerSchema = z.coerce.number().int().positive();
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const MenuTypeSchema = z.enum(["group", "menu", "button"]);

export const MenuCreateSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  group: z.string().trim().min(1).max(100),
  type: MenuTypeSchema,
  parentId: PositiveIntegerSchema.nullable().optional(),
  path: z.string().trim().min(1).max(500).nullable().optional(),
  component: z.string().trim().min(1).max(500).nullable().optional(),
  icon: z.string().trim().min(1).max(100).nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  permissionCode: z.string().trim().min(1).max(100),
  enableState: EnableStateSchema.default(0),
});

export const MenuUpdateSchema = MenuCreateSchema.partial();
export const MenuIdSchema = z.object({ id: PositiveIntegerSchema });
export const MenuUserParamsSchema = z.object({ userId: PositiveIntegerSchema });
export const MenuEffectiveQuerySchema = z.object({
  group: z.string().trim().min(1).max(100),
  keyword: z.string().trim().max(100).optional(),
});
export const MenuQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().optional(),
  group: z.string().trim().optional(),
  type: MenuTypeSchema.optional(),
  parentId: PositiveIntegerSchema.optional(),
  enableState: z.coerce.number().int().optional(),
});
export const MenuTreeQuerySchema = z.object({
  rootId: PositiveIntegerSchema.nullable().optional(),
});

export const MenuResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  group: z.string(),
  type: MenuTypeSchema,
  parentId: z.number().int().positive().nullable(),
  path: z.string().nullable(),
  component: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  permissionCode: z.string(),
  enableState: EnableStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});

export const MenuListResponseSchema = z.object({
  items: z.array(MenuResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const MenuTreeNodeSchema: z.ZodType<
  z.infer<typeof MenuResponseSchema> & { children: unknown[] }
> = MenuResponseSchema.extend({ children: z.lazy(() => z.array(MenuTreeNodeSchema)) });
export const MenuTreeResponseSchema = z.array(MenuTreeNodeSchema);
export const MenuNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("MENU_NOT_FOUND"),
});
export const MenuParentNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("MENU_PARENT_NOT_FOUND"),
});
export const MenuPermissionNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("MENU_PERMISSION_NOT_FOUND"),
});
export const MenuHasChildrenResponseSchema = z.object({
  message: z.string(),
  code: z.literal("MENU_HAS_CHILDREN"),
});

export type MenuCreate = z.infer<typeof MenuCreateSchema>;
export type MenuUpdate = z.infer<typeof MenuUpdateSchema>;
export type MenuQuery = z.infer<typeof MenuQuerySchema>;
export type MenuEffectiveQuery = z.infer<typeof MenuEffectiveQuerySchema>;
