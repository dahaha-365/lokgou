import { AbilityBuilder } from "@casl/ability";
import type {
  PermissionAssignment,
  PermissionCreate,
  PermissionQuery,
  PermissionUpdate,
} from "@lokgou/schemas";
import { createPrismaAbility, type AppAbility } from "@api/lib/casl-prisma";
import { prisma } from "@api/lib/prisma";
import { createCrudModule, createCrudService } from "@api/lib/crud-service";

type Assignment = { effect: "allow" | "deny"; permission: PermissionRecord };
type PermissionRecord = {
  code: string;
  action: string;
  subject: string;
  scope: string;
  enableState: number;
};

type EffectivePermission = PermissionRecord & {
  effect: "allow" | "deny";
  source: "user" | "userRole" | "departmentRole" | "role";
};

type AssignmentOwner = "user" | "role" | "userRole" | "departmentRole";

const activePermission = {
  permission: { deletedAt: null, enableState: 0 },
};

function defineAssignment(
  ability: AbilityBuilder<AppAbility>,
  assignment: Assignment,
  userId: number
) {
  const { permission } = assignment;
  const condition =
    permission.scope === "owner"
      ? { id: userId }
      : permission.scope === "manager"
        ? {
            departmentRoles: {
              some: {
                endedAt: null,
                departmentRole: {
                  department: { leaders: { some: { userId, endedAt: null } } },
                },
              },
            },
          }
        : undefined;
  if (assignment.effect === "allow")
    ability.can(permission.action, permission.subject as "User", condition);
  else ability.cannot(permission.action, permission.subject as "User", condition);
}

export const permissionService = createCrudModule(
  createCrudService({
    create(data: PermissionCreate) {
      return prisma.permission.create({ data });
    },
    show(id: number) {
      return prisma.permission.findFirst({ where: { id, deletedAt: null } });
    },
    update(id: number, data: PermissionUpdate) {
      return prisma.permission.update({ where: { id }, data });
    },
    softDelete(id: number) {
      return prisma.permission.update({ where: { id }, data: { deletedAt: new Date() } });
    },
    async list(params: PermissionQuery) {
      const { page, pageSize, keyword, category, action, subject, scope, enableState } = params;
      const where = {
        deletedAt: null,
        ...(keyword
          ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
          : {}),
        ...(category ? { category } : {}),
        ...(action ? { action } : {}),
        ...(subject ? { subject } : {}),
        ...(scope ? { scope } : {}),
        ...(enableState === undefined ? {} : { enableState }),
      };
      const [items, total] = await prisma.$transaction([
        prisma.permission.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        prisma.permission.count({ where }),
      ]);
      return { items, page, pageSize, total };
    },
    assignUser(userId: number, permissionId: number, data: PermissionAssignment) {
      return prisma.userPermission.upsert({
        where: { userId_permissionId: { userId, permissionId } },
        create: { userId, permissionId, effect: data.effect },
        update: { effect: data.effect },
      });
    },
    assignRole(roleId: number, permissionId: number, data: PermissionAssignment) {
      return prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId, effect: data.effect },
        update: { effect: data.effect },
      });
    },
    assignUserRole(userRoleId: number, permissionId: number, data: PermissionAssignment) {
      return prisma.userRolePermission.upsert({
        where: { userRoleId_permissionId: { userRoleId, permissionId } },
        create: { userRoleId, permissionId, effect: data.effect },
        update: { effect: data.effect },
      });
    },
    assignDepartmentRole(
      departmentRoleId: number,
      permissionId: number,
      data: PermissionAssignment
    ) {
      return prisma.departmentRolePermission.upsert({
        where: { departmentRoleId_permissionId: { departmentRoleId, permissionId } },
        create: { departmentRoleId, permissionId, effect: data.effect },
        update: { effect: data.effect },
      });
    },
    removeUser(userId: number, permissionId: number) {
      return prisma.userPermission.deleteMany({ where: { userId, permissionId } });
    },
    removeRole(roleId: number, permissionId: number) {
      return prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
    },
    removeUserRole(userRoleId: number, permissionId: number) {
      return prisma.userRolePermission.deleteMany({ where: { userRoleId, permissionId } });
    },
    removeDepartmentRole(departmentRoleId: number, permissionId: number) {
      return prisma.departmentRolePermission.deleteMany({
        where: { departmentRoleId, permissionId },
      });
    },
    async ensureAssignmentOwner(owner: AssignmentOwner, id: number) {
      if (owner === "user")
        return Boolean(await prisma.user.findFirst({ where: { id, deletedAt: null } }));
      if (owner === "role")
        return Boolean(await prisma.role.findFirst({ where: { id, deletedAt: null } }));
      if (owner === "userRole") return Boolean(await prisma.userRole.findUnique({ where: { id } }));
      return Boolean(await prisma.departmentRole.findUnique({ where: { id } }));
    },
    async abilityFor(userId: number): Promise<AppAbility> {
      const user = await prisma.user.findFirst({
        where: { id: userId, isAdmin: true, enableState: 0, deletedAt: null },
        include: {
          permissions: { where: activePermission, include: { permission: true } },
          roles: {
            include: {
              permissions: { where: activePermission, include: { permission: true } },
              role: {
                include: {
                  permissionAssignments: { where: activePermission, include: { permission: true } },
                },
              },
            },
          },
          departmentRoles: {
            where: { endedAt: null },
            include: {
              departmentRole: {
                include: {
                  permissions: { where: activePermission, include: { permission: true } },
                },
              },
            },
          },
        },
      });
      const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);
      if (!user) return build();
      if (user.isAdmin && user.username === "admin") can("manage", "all");
      // CASL evaluates the most recently defined matching rule first. Define sources
      // from lowest to highest priority: role < department role < user role < user.
      for (const item of user.roles.flatMap((userRole) => userRole.role.permissionAssignments))
        defineAssignment({ can, cannot } as AbilityBuilder<AppAbility>, item, userId);
      for (const assignment of user.departmentRoles.flatMap(
        (item) => item.departmentRole.permissions
      ))
        defineAssignment({ can, cannot } as AbilityBuilder<AppAbility>, assignment, userId);
      for (const userRole of user.roles)
        for (const assignment of userRole.permissions)
          defineAssignment({ can, cannot } as AbilityBuilder<AppAbility>, assignment, userId);
      for (const assignment of user.permissions)
        defineAssignment({ can, cannot } as AbilityBuilder<AppAbility>, assignment, userId);
      return build();
    },
    async effectivePermissions(userId: number): Promise<EffectivePermission[]> {
      const user = await prisma.user.findFirst({
        where: { id: userId, isAdmin: true, enableState: 0, deletedAt: null },
        include: {
          permissions: { where: activePermission, include: { permission: true } },
          roles: {
            include: {
              permissions: { where: activePermission, include: { permission: true } },
              role: {
                include: {
                  permissionAssignments: { where: activePermission, include: { permission: true } },
                },
              },
            },
          },
          departmentRoles: {
            where: { endedAt: null },
            include: {
              departmentRole: {
                include: {
                  permissions: { where: activePermission, include: { permission: true } },
                },
              },
            },
          },
        },
      });
      if (!user) return [];
      const resolved = new Map<string, EffectivePermission>();
      const add = (source: EffectivePermission["source"], assignment: Assignment) => {
        const { permission, effect } = assignment;
        resolved.set(permission.code, {
          ...permission,
          effect,
          source,
        });
      };
      for (const item of user.roles.flatMap((userRole) => userRole.role.permissionAssignments))
        add("role", item);
      for (const assignment of user.departmentRoles.flatMap(
        (item) => item.departmentRole.permissions
      ))
        add("departmentRole", assignment);
      for (const userRole of user.roles)
        for (const assignment of userRole.permissions) add("userRole", assignment);
      for (const assignment of user.permissions) add("user", assignment);
      return [...resolved.values()];
    },
    canAccessUser(ability: AppAbility, action: string) {
      return ability.can(action, "User");
    },
  }),
  {}
);
