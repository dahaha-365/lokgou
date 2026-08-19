import { Elysia } from "elysia";
import { departmentController } from "./department.controller";
import { departmentLeaderController } from "./leader/department-leader.controller";

export const departmentsRoutes = new Elysia({ prefix: "/departments" })
  .use(departmentController)
  .use(departmentLeaderController);
