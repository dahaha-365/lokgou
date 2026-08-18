import { prisma } from "../../lib/prisma";
import type { UserCreate, UserUpdate, UserQuery } from "@lokgou/schemas";

export const userService = {
  create(data: UserCreate) {
    return prisma.user.create({ data });
  },
  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },
  update(id: string, data: UserUpdate) {
    return prisma.user.update({ where: { id }, data });
  },
  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async list(params: UserQuery) {
    const { page, pageSize, keyword, enableState } = params;
    const where = {
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword } },
              { name: { contains: keyword } },
              { email: { contains: keyword } },
            ],
          }
        : {}),
      ...(enableState !== undefined ? { enableState } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, page, pageSize, total };
  },
};
