import { prisma } from "../../../lib/prisma";
import { autoCodeService } from "../system/autocode/autocode.service";
import type { UserCreate, UserUpdate, UserQuery } from "@lokgou/schemas";

export const userService = {
  async create(data: UserCreate) {
    const { password, username, ...userData } = data;
    return prisma.user.create({
      data: {
        ...userData,
        username: username ?? (await autoCodeService.generate("USERNAME")),
        passwordHash: await Bun.password.hash(password),
      },
    });
  },
  findById(id: number) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },
  async update(id: number, data: UserUpdate) {
    const { password, ...userData } = data;
    return prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(password ? { passwordHash: await Bun.password.hash(password) } : {}),
      },
    });
  },
  softDelete(id: number) {
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
