import { Elysia } from "elysia";
import { authController } from "./auth/auth.controller";
import { departmentLeaderController } from "./department-leaders/department-leader.controller";
import { departmentController } from "./departments/department.controller";
import { userController } from "./users/user.controller";
import { autoCodeController } from "./system/autocode/autocode.controller";

export const adminRoutes = new Elysia()
  .use(authController)
  .use(userController)
  .use(departmentController)
  .use(departmentLeaderController)
  .use(autoCodeController);
