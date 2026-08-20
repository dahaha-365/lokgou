import { prisma } from "@api/lib/prisma";
import { autoCodeService } from "../system/autocode/autocode.service";
import type { UserCreate, UserUpdate, UserQuery } from "@lokgou/schemas";
import { createCrudService } from "@api/lib/crud-service";

export const userService = createCrudService({
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
  show(id: number, accessWhere?: object) {
    return prisma.user.findFirst({
      where: { AND: [{ id, deletedAt: null }, ...(accessWhere ? [accessWhere] : [])] },
    });
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
  async list(params: UserQuery, accessWhere?: object) {
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
    const scopedWhere = { AND: [where, ...(accessWhere ? [accessWhere] : [])] };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: scopedWhere,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: scopedWhere }),
    ]);
    return { items, page, pageSize, total };
  },
});
