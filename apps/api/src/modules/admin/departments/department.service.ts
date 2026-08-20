import { prisma } from "@api/lib/prisma";
import { autoCodeService } from "../system/autocode/autocode.service";
import type { DepartmentCreate, DepartmentUpdate, DepartmentQuery } from "@lokgou/schemas";
import { createCrudService } from "@api/lib/crud-service";

export const departmentService = createCrudService({
  async create(data: DepartmentCreate) {
    const { code, ...departmentData } = data;
    return prisma.department.create({
      data: {
        ...departmentData,
        code: code ?? (await autoCodeService.generate("DEPARTMENT_CODE")),
      },
    });
  },
  show(id: number) {
    return prisma.department.findFirst({ where: { id, deletedAt: null } });
  },
  update(id: number, data: DepartmentUpdate) {
    return prisma.department.update({ where: { id }, data });
  },
  delete(id: number) {
    return prisma.department.delete({ where: { id } });
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
});
