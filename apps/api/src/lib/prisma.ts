import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";
import { treeModelExtension } from "./prisma/extends/tree-model";
import "./config";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const url =
  databaseUrl.startsWith("file:") && !databaseUrl.startsWith("file:///")
    ? pathToFileURL(resolve(import.meta.dirname, "../..", databaseUrl.slice(5))).href
    : databaseUrl;

const adapter = new PrismaLibSql({ url });

/** IMPORTANT: 全局只创建一个 PrismaClient，扩展由各 service 按需加载。 */
export const prisma = new PrismaClient({ adapter });
