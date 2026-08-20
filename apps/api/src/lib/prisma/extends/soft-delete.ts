import { Prisma } from "../../../generated/prisma/client";
import { isSoftDeleteModel } from "../../model-capabilities";

type Delegate = {
  update: (args: { where: object; data: object }) => unknown;
  updateMany: (args: { where?: object; data: object }) => unknown;
};

export const softDeleteExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "soft-delete",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !isSoftDeleteModel(model)) return query(args);
          const delegate = (client as unknown as Record<string, Delegate>)[
            model.charAt(0).toLowerCase() + model.slice(1)
          ];
          if (!delegate) return query(args);
          if (operation === "delete") {
            return delegate.update({
              where: (args as unknown as { where: object }).where,
              data: { deletedAt: new Date() },
            });
          }
          if (operation === "deleteMany") {
            return delegate.updateMany({
              where: (args as unknown as { where?: object }).where,
              data: { deletedAt: new Date() },
            });
          }
          if (["findFirst", "findMany", "findUnique", "count"].includes(operation)) {
            const current = args as unknown as { where?: object };
            return query({ ...args, where: { ...current.where, deletedAt: null } });
          }
          return query(args);
        },
      },
    },
  })
);
