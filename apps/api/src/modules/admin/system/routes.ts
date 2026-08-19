import { Elysia } from "elysia";
import { autoCodeController } from "./autocode/autocode.controller";
import { auditLogController } from "./audit-logs/audit-log.controller";
import { dictController } from "./dicts/dict.controller";

export const systemRoutes = new Elysia({ prefix: "/system" })
  .use(autoCodeController)
  .use(auditLogController)
  .use(dictController);
