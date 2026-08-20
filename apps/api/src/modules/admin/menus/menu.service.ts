import type { MenuCreate, MenuEffectiveQuery, MenuQuery, MenuUpdate } from "@lokgou/schemas";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@api/lib/prisma";
import { permissionService } from "../permissions/permission.service";
import { createCrudModule, createCrudService } from "@api/lib/crud-service";

export type MenuFailure =
  "MENU_NOT_FOUND" | "MENU_PARENT_NOT_FOUND" | "MENU_PERMISSION_NOT_FOUND" | "MENU_HAS_CHILDREN";

const activeMenu = { deletedAt: null, enableState: 0 } as const;
const menuOrder: Prisma.MenuOrderByWithRelationInput[] = [
  { group: "asc" },
  { sortOrder: "asc" },
  { id: "asc" },
];

export const menuService = createCrudModule(
  createCrudService({
    show(id: number) {
      return prisma.menu.findFirst({ where: { id, deletedAt: null } });
    },
    async create(data: MenuCreate) {
      return prisma.$transaction(async (tx) => {
        const permission = await tx.permission.findFirst({
          where: { code: data.permissionCode, deletedAt: null, enableState: 0 },
        });
        if (!permission) return { failure: "MENU_PERMISSION_NOT_FOUND" } as const;

        if (data.parentId !== null && data.parentId !== undefined) {
          const parent = await tx.menu.findFirst({ where: { id: data.parentId, ...activeMenu } });
          if (!parent || parent.group !== data.group)
            return { failure: "MENU_PARENT_NOT_FOUND" } as const;
        }
        return { item: await tx.menu.create({ data }) } as const;
      });
    },
    async update(id: number, data: MenuUpdate) {
      return prisma.$transaction(async (tx) => {
        const current = await tx.menu.findFirst({ where: { id, deletedAt: null } });
        if (!current) return { failure: "MENU_NOT_FOUND" } as const;

        const permissionCode = data.permissionCode ?? current.permissionCode;
        const permission = await tx.permission.findFirst({
          where: { code: permissionCode, deletedAt: null, enableState: 0 },
        });
        if (!permission) return { failure: "MENU_PERMISSION_NOT_FOUND" } as const;

        const parentId = data.parentId === undefined ? current.parentId : data.parentId;
        if (parentId !== null) {
          if (parentId === id) return { failure: "MENU_PARENT_NOT_FOUND" } as const;
          const parent = await tx.menu.findFirst({ where: { id: parentId, ...activeMenu } });
          if (!parent || parent.group !== (data.group ?? current.group))
            return { failure: "MENU_PARENT_NOT_FOUND" } as const;
          let ancestor = parent;
          const visited = new Set<number>();
          while (ancestor.parentId !== null) {
            if (visited.has(ancestor.id)) return { failure: "MENU_PARENT_NOT_FOUND" } as const;
            visited.add(ancestor.id);
            const next = await tx.menu.findFirst({
              where: { id: ancestor.parentId, ...activeMenu },
            });
            if (!next || next.id === id) return { failure: "MENU_PARENT_NOT_FOUND" } as const;
            ancestor = next;
          }
        }
        return { item: await tx.menu.update({ where: { id }, data }) } as const;
      });
    },
    async softDelete(id: number) {
      return prisma.$transaction(async (tx) => {
        const menu = await tx.menu.findFirst({ where: { id, deletedAt: null } });
        if (!menu) return { failure: "MENU_NOT_FOUND" } as const;
        const child = await tx.menu.findFirst({ where: { parentId: id, ...activeMenu } });
        if (child) return { failure: "MENU_HAS_CHILDREN" } as const;
        await tx.menu.update({ where: { id }, data: { deletedAt: new Date() } });
        return {} as const;
      });
    },
    async list(params: MenuQuery) {
      const { page, pageSize, keyword, group, type, parentId, enableState } = params;
      const where = {
        deletedAt: null,
        ...(keyword
          ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
          : {}),
        ...(group ? { group } : {}),
        ...(type ? { type } : {}),
        ...(parentId === undefined ? {} : { parentId }),
        ...(enableState === undefined ? {} : { enableState }),
      };
      const [items, total] = await prisma.$transaction([
        prisma.menu.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: menuOrder,
        }),
        prisma.menu.count({ where }),
      ]);
      return { items, page, pageSize, total };
    },
    async effectiveForUser(userId: number, { group, keyword }: MenuEffectiveQuery) {
      const permissionCodes = (await permissionService.effectivePermissions(userId))
        .filter((permission) => permission.effect === "allow")
        .map((permission) => permission.code);
      if (!permissionCodes.length) return [];
      return prisma.menu.findMany({
        where: {
          ...activeMenu,
          group,
          permissionCode: { in: permissionCodes },
          ...(keyword
            ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
            : {}),
        },
        orderBy: menuOrder,
      });
    },
  }),
  {}
);
