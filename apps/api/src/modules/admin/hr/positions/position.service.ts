import { prisma } from "../../../../lib/prisma";
import type { PositionCreate, PositionUpdate, PositionQuery } from "@lokgou/schemas";

export const positionService = {
  create(data: PositionCreate) {
    return prisma.position.create({ data });
  },
  findById(id: number) {
    return prisma.position.findFirst({ where: { id, deletedAt: null } });
  },
  update(id: number, data: PositionUpdate) {
    return prisma.position.update({ where: { id }, data });
  },
  softDelete(id: number) {
    return prisma.position.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async list(params: PositionQuery) {
    const { page, pageSize, keyword, name, enableState } = params;
    const where = {
      deletedAt: null,
      ...(keyword
        ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
        : {}),
      ...(name ? { name: { contains: name } } : {}),
      ...(enableState !== undefined ? { enableState } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.position.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.position.count({ where }),
    ]);
    return { items, page, pageSize, total };
  },
};
