import { prisma } from "@api/lib/prisma";
import { softDeleteExtension } from "@api/lib/prisma/extends/soft-delete";
import type { PositionCreate, PositionUpdate, PositionQuery } from "@lokgou/schemas";
import { createCrudModule, createCrudServiceFromModel } from "@api/lib/crud-service";
import { autoCodeService } from "../../system/autocode/autocode.service";

const positionPrisma = prisma.$extends(softDeleteExtension);

type PositionEntity = NonNullable<Awaited<ReturnType<typeof positionPrisma.position.findFirst>>>;
type PositionListResult = Awaited<ReturnType<typeof listPositions>>;

const listPositions = async (
  params: PositionQuery,
  deletedAt?: Date | null,
  onlyDeleted = false
) => {
  const { page, pageSize, keyword, name, enableState } = params;
  const where = {
    ...(onlyDeleted ? { deletedAt: { not: null } } : { deletedAt }),
    ...(keyword ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] } : {}),
    ...(name ? { name: { contains: name } } : {}),
    ...(enableState !== undefined ? { enableState } : {}),
  };
  const [items, total] = await prisma.$transaction([
    positionPrisma.position.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    positionPrisma.position.count({ where }),
  ]);
  return { items, page, pageSize, total };
};

const standardPositionService = createCrudServiceFromModel<
  typeof positionPrisma.position,
  PositionEntity,
  PositionCreate,
  PositionUpdate,
  PositionQuery,
  PositionListResult
>({
  model: positionPrisma.position,
  async create(data) {
    return this.model.create({
      data: { ...data, code: data.code ?? (await autoCodeService.generate("POSITION_CODE")) },
    });
  },
  show(id) {
    return this.model.findFirst({ where: { id: id as number } });
  },
  update(id, data) {
    return this.model.update({ where: { id }, data });
  },
  list: (params: PositionQuery) => listPositions(params, null),
});

/**
 * Position service module. Standard CRUD operations are provided by the
 * shared module and can be overridden or extended here as the resource grows.
 */
export const positionService = createCrudModule(standardPositionService, {
  restore(id: number) {
    return positionPrisma.position.update({ where: { id }, data: { deletedAt: null } });
  },
  forceDelete(id: number) {
    return prisma.position.delete({ where: { id } });
  },
  withTrashed: (params: PositionQuery) => listPositions(params),
  onlyTrashed: (params: PositionQuery) => listPositions(params, null, true),
  listEnabled() {
    return standardPositionService.list({ page: 1, pageSize: 100, enableState: 1 });
  },
});
