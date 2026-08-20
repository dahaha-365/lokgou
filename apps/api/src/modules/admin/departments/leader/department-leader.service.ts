import { prisma } from "@api/lib/prisma";
import type {
  DepartmentLeaderCreate,
  DepartmentLeaderUpdate,
  DepartmentLeaderQuery,
} from "@lokgou/schemas";
import { createCrudModule, createCrudService } from "@api/lib/crud-service";

export const departmentLeaderService = createCrudModule(
  createCrudService({
    create(data: DepartmentLeaderCreate) {
      return prisma.departmentLeader.create({
        data: {
          userId: data.userId,
          departmentId: data.departmentId,
          role: data.role ?? "primary",
          startedAt: data.startedAt ?? new Date(),
          endedAt: data.endedAt,
        },
      });
    },
    show(id: number) {
      return prisma.departmentLeader.findUnique({ where: { id } });
    },
    update(id: number, data: DepartmentLeaderUpdate) {
      return prisma.departmentLeader.update({ where: { id }, data });
    },
    delete(id: number) {
      return prisma.departmentLeader.delete({ where: { id } });
    },
    list(params: DepartmentLeaderQuery) {
      return prisma.departmentLeader.findMany({
        where: {
          ...(params.departmentId ? { departmentId: params.departmentId } : {}),
          ...(params.userId ? { userId: params.userId } : {}),
          ...(params.role ? { role: params.role } : {}),
        },
        orderBy: { startedAt: "desc" },
      });
    },
  }),
  {}
);
