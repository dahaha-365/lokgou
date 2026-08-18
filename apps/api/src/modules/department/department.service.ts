import { prisma } from "../../lib/prisma";
import type { DepartmentCreate, DepartmentUpdate, DepartmentQuery } from "@lokgou/schemas";

export const departmentService = {
  create(data: DepartmentCreate) {
    return prisma.department.create({ data });
  },
  findById(id: string) {
    return prisma.department.findFirst({ where: { id, deletedAt: null } });
  },
  update(id: string, data: DepartmentUpdate) {
    return prisma.department.update({ where: { id }, data });
  },
  softDelete(id: string) {
    return prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async list(params: DepartmentQuery) {
    const { page, pageSize, keyword, parentId, enableState } = params;
    const where = {
      deletedAt: null,
      ...(keyword ? { name: { contains: keyword } } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(enableState !== undefined ? { enableState } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.department.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.department.count({ where }),
    ]);
    return { items, page, pageSize, total };
  },
};
