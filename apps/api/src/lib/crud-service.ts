import { Elysia } from "elysia";
import { exposeErrorDetails } from "@api/lib/config";
import { localizeValidationIssues, requestLocale, t } from "@api/lib/i18n";

function envelope(response: unknown): unknown {
  if (response instanceof Response || !response || typeof response !== "object") return response;
  if ("code" in response && "message" in response && "data" in response) return response;
  const { code, message, issues, ...data } = response as Record<string, unknown>;
  return new Response(
    JSON.stringify({
      code: typeof code === "string" ? code : "OK",
      message: typeof message === "string" ? message : "OK",
      data: issues === undefined ? data : { ...data, issues },
    }),
    { headers: { "content-type": "application/json" } }
  );
}

/**
 * Functional CRUD service composition for Prisma-like persistence adapters.
 *
 * The factory deliberately knows nothing about Prisma, HTTP, schemas, or
 * authorization. Each operation is supplied by the caller so model-specific
 * filtering, transactions, generated identifiers, and access constraints stay
 * explicit at the module boundary.
 */
export type CrudServiceAdapter<Entity, CreateInput, UpdateInput, QueryInput, ListResult> = {
  create: (data: CreateInput) => Promise<Entity> | Entity;
  show: (identifier: unknown, ...context: unknown[]) => Promise<Entity | null> | Entity | null;
  update: (id: number, data: UpdateInput) => Promise<Entity> | Entity;
  delete: (id: number) => Promise<Entity> | Entity;
  list: (params: QueryInput) => Promise<ListResult> | ListResult;
};

export type CrudService<Entity, CreateInput, UpdateInput, QueryInput, ListResult> =
  CrudServiceAdapter<Entity, CreateInput, UpdateInput, QueryInput, ListResult>;

export type CrudServiceContext<Model> = {
  model: Model;
};

export type SoftDeleteService<Entity, QueryInput, ListResult> = {
  delete: (id: number) => Promise<Entity> | Entity;
  restore: (id: number) => Promise<Entity> | Entity;
  forceDelete: (id: number) => Promise<Entity> | Entity;
  withTrashed: (params: QueryInput) => Promise<ListResult> | ListResult;
  onlyTrashed: (params: QueryInput) => Promise<ListResult> | ListResult;
};

export type SoftDeleteAdapter<Entity, QueryInput, ListResult> = SoftDeleteService<
  Entity,
  QueryInput,
  ListResult
>;

/**
 * A CRUD module keeps the standard operations while allowing a resource to
 * replace any of them and add resource-specific operations.
 */
export type CrudModule<
  Standard extends object,
  Extensions extends Record<string, unknown> = Record<never, never>,
> = Standard & Extensions;

/**
 * An explicit route contract. A service method is never exposed over HTTP
 * merely because it exists; it must be listed here with its registration
 * function, where schemas, auth guards, and OpenAPI metadata are declared.
 */
export type CrudRouteContract<
  Service extends object,
  RouteService extends object = Service,
> = readonly {
  serviceMethod: keyof RouteService;
  register: (service: RouteService) => unknown;
}[];

/** The assembled Elysia plugin containing the explicitly contracted routes. */
export type CrudRoutePlugin = Elysia;

export type CrudModuleRoutes = { routes: CrudRoutePlugin };

export const createCrudModule = <
  Standard extends object,
  Extensions extends Record<string, unknown> = Record<never, never>,
>(
  standard: Standard,
  extensions?: Partial<Standard> & Extensions,
  routeContract: CrudRouteContract<CrudModule<Standard, Extensions>> = []
): CrudModule<Standard, Extensions> & CrudModuleRoutes => {
  const service = { ...standard, ...extensions } as CrudModule<Standard, Extensions>;
  const routes = routeContract
    .reduce<CrudRoutePlugin>(
      (app, route) => app.use(route.register(service) as CrudRoutePlugin),
      new Elysia()
    )
    .onAfterHandle(({ response }) => envelope(response))
    .onError(({ code, error, request, set }) => {
      const locale = requestLocale(request.headers.get("accept-language") ?? undefined);
      if (code === "VALIDATION") {
        set.status = 422;
        return {
          code: "VALIDATION_ERROR",
          message: t(locale, "common.validationFailed"),
          data: { issues: localizeValidationIssues(error.all, locale) },
        };
      }
      set.status = code === "NOT_FOUND" ? 404 : 500;
      return {
        code: code === "NOT_FOUND" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
        message: t(locale, code === "NOT_FOUND" ? "common.notFound" : "common.internalServerError"),
        data:
          code === "NOT_FOUND" || !exposeErrorDetails()
            ? null
            : { details: error instanceof Error ? error.message : error },
      };
    });
  return Object.assign(service, { routes }) as CrudModule<Standard, Extensions> & CrudModuleRoutes;
};

export const createCrudService = <Adapter extends object>(
  adapter: Adapter,
  extensions?: Record<string, unknown>
): Adapter & Record<string, unknown> =>
  createCrudModule(adapter, extensions as Partial<Adapter> & Record<string, unknown>);

export const createCrudServiceFromModel = <
  Model,
  Entity,
  CreateInput,
  UpdateInput,
  QueryInput,
  ListResult,
>(options: {
  model: Model;
  create: (this: CrudServiceContext<Model>, data: CreateInput) => Promise<Entity> | Entity;
  show: (
    this: CrudServiceContext<Model>,
    identifier: unknown,
    ...context: unknown[]
  ) => Promise<Entity | null> | Entity | null;
  update: (
    this: CrudServiceContext<Model>,
    id: number,
    data: UpdateInput
  ) => Promise<Entity> | Entity;
  list: (this: CrudServiceContext<Model>, params: QueryInput) => Promise<ListResult> | ListResult;
}) => {
  const context = { model: options.model } as CrudServiceContext<Model>;
  const service = {
    model: options.model,
    create: (data: CreateInput) => options.create.call(context, data),
    show: (identifier: unknown, ...extraContext: unknown[]) =>
      options.show.call(context, identifier, ...extraContext),
    update: (id: number, data: UpdateInput) => options.update.call(context, id, data),
    delete: (id: number) =>
      (
        options.model as { delete: (args: { where: { id: number } }) => Promise<Entity> | Entity }
      ).delete({ where: { id } }),
    list: (params: QueryInput) => options.list.call(context, params),
  } as const;
  return service;
};
