import { Elysia } from "elysia";
import { positionsRoutes } from "./positions/routes";

export const hrRoutes = new Elysia({ prefix: "/hr" }).use(positionsRoutes);
