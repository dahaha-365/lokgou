import type { Ability } from "@casl/ability";
import {
  accessibleBy,
  createCaslExtension,
  createPrismaAbility,
  type Model,
  type PrismaQueryOf,
  type Subjects,
  type WhereInputOf,
} from "@casl/prisma/runtime";
import type { Prisma, User } from "../generated/prisma/client";

export { accessibleBy, createCaslExtension, createPrismaAbility };

export type AppSubjects = "all" | "User" | Subjects<{ User: User }>;
export type AppAbility = Ability<[string, AppSubjects], PrismaQuery>;
export type PrismaQuery<
  T extends Model<Record<string, unknown>, string> = Model<Record<string, unknown>, string>,
> = PrismaQueryOf<Prisma.TypeMap, T>;
export type WhereInput<TModelName extends Prisma.ModelName> = WhereInputOf<
  Prisma.TypeMap,
  TModelName
>;
