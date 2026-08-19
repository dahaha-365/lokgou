import { Elysia } from "elysia";
import { positionController } from "./position.controller";

export const positionsRoutes = new Elysia({ prefix: "/positions" }).use(positionController);
