import { Prisma } from "../../../generated/prisma/client";

export type TreeModelOptions = {
  idField?: string;
  parentIdField?: string;
  rootId?: unknown;
  where?: object;
  orderBy?: object | object[];
};

type TreeDelegate = {
  findMany: (args: { where?: object; orderBy?: object | object[] }) => Promise<unknown[]>;
};

type TreeNode = Record<string, unknown> & { children: TreeNode[] };

/** Adds a non-mutating, cycle-safe tree query to every Prisma model delegate. */
export const treeModelExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "tree-model",
    model: {
      $allModels: {
        async tree(this: unknown, options: TreeModelOptions = {}): Promise<TreeNode[]> {
          const { idField = "id", parentIdField = "parentId", rootId, where, orderBy } = options;
          const delegate = Prisma.getExtensionContext(this) as unknown as TreeDelegate;
          const rows = (await delegate.findMany({ where, orderBy })) as Record<string, unknown>[];
          const byId = new Map<unknown, Record<string, unknown>>();
          for (const row of rows) byId.set(row[idField], row);

          const roots = rows.filter((row) =>
            rootId === undefined || rootId === null
              ? row[parentIdField] === undefined || row[parentIdField] === null
              : row[idField] === rootId
          );
          const build = (row: Record<string, unknown>, path: Set<unknown>): TreeNode => {
            const id = row[idField];
            if (path.has(id)) return { ...row, children: [] };
            const nextPath = new Set(path).add(id);
            const children = rows
              .filter(
                (candidate) => candidate[parentIdField] === id && !nextPath.has(candidate[idField])
              )
              .map((child) => build(child, nextPath));
            return { ...row, children };
          };
          if (rootId !== undefined && rootId !== null && !byId.has(rootId)) return [];
          return roots.map((root) => build(root, new Set()));
        },
      },
    },
  })
);
