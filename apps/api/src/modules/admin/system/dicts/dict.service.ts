import type {
  DictCreate,
  DictItemCreate,
  DictItemQuery,
  DictItemUpdate,
  DictQuery,
  DictUpdate,
} from "@lokgou/schemas";
import { prisma } from "../../../../lib/prisma";

export type DictFailure = "DICT_NOT_FOUND" | "DICT_HAS_ITEMS";
export type DictItemFailure = "DICT_NOT_FOUND" | "DICT_ITEM_NOT_FOUND";

const existingDict = { deletedAt: null } as const;

export const dictService = {
  findById(id: number) {
    return prisma.dict.findFirst({ where: { id, deletedAt: null } });
  },
  create(data: DictCreate) {
    return prisma.$transaction(async (tx) => ({ item: await tx.dict.create({ data }) }));
  },
  async update(id: number, data: DictUpdate) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id, deletedAt: null } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      return { item: await tx.dict.update({ where: { id }, data }) } as const;
    });
  },
  async softDelete(id: number) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id, deletedAt: null } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      const item = await tx.dictItem.findFirst({ where: { dictId: id, deletedAt: null } });
      if (item) return { failure: "DICT_HAS_ITEMS" } as const;
      await tx.dict.update({ where: { id }, data: { deletedAt: new Date() } });
      return {} as const;
    });
  },
  async list(params: DictQuery) {
    const { page, pageSize, keyword, enableState } = params;
    const where = {
      deletedAt: null,
      ...(keyword
        ? { OR: [{ code: { contains: keyword } }, { name: { contains: keyword } }] }
        : {}),
      ...(enableState === undefined ? {} : { enableState }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.dict.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ code: "asc" }, { id: "asc" }],
      }),
      prisma.dict.count({ where }),
    ]);
    return { items, page, pageSize, total };
  },
  async findItem(dictId: number, itemId: number) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id: dictId, ...existingDict } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      const item = await tx.dictItem.findFirst({ where: { id: itemId, dictId, deletedAt: null } });
      return item ? ({ item } as const) : ({ failure: "DICT_ITEM_NOT_FOUND" } as const);
    });
  },
  async createItem(dictId: number, data: DictItemCreate) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id: dictId, ...existingDict } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      return { item: await tx.dictItem.create({ data: { ...data, dictId } }) } as const;
    });
  },
  async updateItem(dictId: number, itemId: number, data: DictItemUpdate) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id: dictId, ...existingDict } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      const item = await tx.dictItem.findFirst({ where: { id: itemId, dictId, deletedAt: null } });
      if (!item) return { failure: "DICT_ITEM_NOT_FOUND" } as const;
      return { item: await tx.dictItem.update({ where: { id: itemId }, data }) } as const;
    });
  },
  async softDeleteItem(dictId: number, itemId: number) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id: dictId, ...existingDict } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      const item = await tx.dictItem.findFirst({ where: { id: itemId, dictId, deletedAt: null } });
      if (!item) return { failure: "DICT_ITEM_NOT_FOUND" } as const;
      await tx.dictItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
      return {} as const;
    });
  },
  async listItems(dictId: number, params: DictItemQuery) {
    return prisma.$transaction(async (tx) => {
      const dict = await tx.dict.findFirst({ where: { id: dictId, ...existingDict } });
      if (!dict) return { failure: "DICT_NOT_FOUND" } as const;
      const { page, pageSize, keyword, enableState } = params;
      const where = {
        dictId,
        deletedAt: null,
        ...(keyword
          ? { OR: [{ label: { contains: keyword } }, { value: { contains: keyword } }] }
          : {}),
        ...(enableState === undefined ? {} : { enableState }),
      };
      const [items, total] = await Promise.all([
        tx.dictItem.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        }),
        tx.dictItem.count({ where }),
      ]);
      return { items, page, pageSize, total } as const;
    });
  },
};
