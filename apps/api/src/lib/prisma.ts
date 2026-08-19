import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createCaslExtension } from "./casl-prisma";
import { PrismaClient } from "../generated/prisma/client";
import "./config";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const url =
  databaseUrl.startsWith("file:") && !databaseUrl.startsWith("file:///")
    ? pathToFileURL(resolve(import.meta.dirname, "../..", databaseUrl.slice(5))).href
    : databaseUrl;

const adapter = new PrismaLibSql({
  url,
});

export const prisma = new PrismaClient({ adapter }).$extends(createCaslExtension());
