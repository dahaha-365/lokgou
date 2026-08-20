import type { Prisma } from "../generated/prisma/client";

export type ModelCapability = {
  softDeletes?: true;
};

export const modelCapabilities = {
  User: { softDeletes: true },
  Department: { softDeletes: true },
  Position: { softDeletes: true },
  Role: { softDeletes: true },
  Permission: { softDeletes: true },
  Menu: { softDeletes: true },
} satisfies Partial<Record<Prisma.ModelName, ModelCapability>>;

export const isSoftDeleteModel = (model: string): boolean =>
  model in modelCapabilities &&
  modelCapabilities[model as keyof typeof modelCapabilities]?.softDeletes;
