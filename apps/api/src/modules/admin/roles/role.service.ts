import { prisma } from "../../../lib/prisma";
import type {
  DepartmentRoleConfigure,
  RoleCreate,
  RoleQuery,
  RoleUpdate,
  UserDepartmentRoleAssign,
} from "@lokgou/schemas";

export const roleService = {
  create(data: RoleCreate) {
    return prisma.role.create({ data: { ...data, permissions: JSON.stringify(data.permissions) } });
  },
  findById(id: number) {
    return prisma.role.findFirst({ where: { id, deletedAt: null } });
  },
  update(id: number, data: RoleUpdate) {
    const { permissions, ...rest } = data;
    return prisma.role.update({
      where: { id },
      data: {
        ...rest,
        ...(permissions === undefined ? {} : { permissions: JSON.stringify(permissions) }),
      },
    });
  },
  softDelete(id: number) {
    return prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async list(params: RoleQuery) {
    const { page, pageSize, keyword, enableState } = params;
    const where = {
      deletedAt: null,
      ...(keyword
        ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
        : {}),
      ...(enableState === undefined ? {} : { enableState }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.role.count({ where }),
    ]);
    return { items, page, pageSize, total };
  },
  findUser(id: number) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },
  findDepartment(id: number) {
    return prisma.department.findFirst({ where: { id, deletedAt: null } });
  },
  assignUser(roleId: number, userId: number) {
    return prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
  },
  removeUser(roleId: number, userId: number) {
    return prisma.userRole.deleteMany({ where: { roleId, userId } });
  },
  configureDepartment(roleId: number, departmentId: number, data: DepartmentRoleConfigure) {
    return prisma.departmentRole.upsert({
      where: { departmentId_roleId: { departmentId, roleId } },
      create: {
        departmentId,
        roleId,
        grantedPermissions: JSON.stringify(data.grantedPermissions ?? []),
        revokedPermissions: JSON.stringify(data.revokedPermissions ?? []),
      },
      update: {
        ...(data.grantedPermissions === undefined
          ? {}
          : { grantedPermissions: JSON.stringify(data.grantedPermissions) }),
        ...(data.revokedPermissions === undefined
          ? {}
          : { revokedPermissions: JSON.stringify(data.revokedPermissions) }),
      },
    });
  },
  findDepartmentRole(roleId: number, departmentId: number) {
    return prisma.departmentRole.findUnique({
      where: { departmentId_roleId: { departmentId, roleId } },
    });
  },
  removeDepartmentRole(roleId: number, departmentId: number) {
    return prisma.departmentRole.delete({
      where: { departmentId_roleId: { departmentId, roleId } },
    });
  },
  async assignDepartmentUser(
    departmentRoleId: number,
    userId: number,
    data: UserDepartmentRoleAssign
  ) {
    const active = await prisma.userDepartmentRole.findFirst({
      where: { departmentRoleId, userId, endedAt: null },
    });
    return (
      active ??
      prisma.userDepartmentRole.create({
        data: {
          departmentRoleId,
          userId,
          startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        },
      })
    );
  },
  async endDepartmentUser(departmentRoleId: number, userId: number) {
    const active = await prisma.userDepartmentRole.findFirst({
      where: { departmentRoleId, userId, endedAt: null },
    });
    return active
      ? prisma.userDepartmentRole.update({
          where: { id: active.id },
          data: { endedAt: new Date() },
        })
      : null;
  },
};
