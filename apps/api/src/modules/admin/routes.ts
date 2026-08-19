import { Elysia } from "elysia";
import { roleController } from "./roles/role.controller";
import { authController } from "./auth/auth.controller";
import { departmentsRoutes } from "./departments/routes";
import { userController } from "./users/user.controller";
import { autoCodeController } from "./system/autocode/autocode.controller";
import { permissionController } from "./permissions/permission.controller";
import { menuController } from "./menus/menu.controller";
import { dictController } from "./dicts/dict.controller";
import { attachmentController } from "./attachments/attachment.controller";

export const adminRoutes = new Elysia()
  .use(authController)
  .use(userController)
  .use(departmentsRoutes)
  .use(autoCodeController)
  .use(roleController)
  .use(permissionController)
  .use(menuController)
  .use(dictController)
  .use(attachmentController);
