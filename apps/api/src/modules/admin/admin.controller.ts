import { Elysia } from "elysia";
import { adminPrefix, getAdminAppKey } from "../../lib/config";
import { userController } from "../user/user.controller";
import { departmentController } from "../department/department.controller";
import { departmentLeaderController } from "../department-leader/department-leader.controller";

export const adminController = new Elysia({ prefix: adminPrefix })
  .onBeforeHandle(({ headers, status }) => {
    const adminAppKey = getAdminAppKey();
    if (!adminAppKey || headers["admin-app-key"] !== adminAppKey) {
      return status(401, {
        message: "无效的 admin-app-key",
        code: "ADMIN_UNAUTHORIZED",
      });
    }
  })
  .use(userController)
  .use(departmentController)
  .use(departmentLeaderController);
