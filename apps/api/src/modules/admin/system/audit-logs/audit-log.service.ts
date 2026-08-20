import type { AuditLogQuery } from "@lokgou/schemas";
import { prisma } from "@api/lib/prisma";

type RecordOperationInput = {
  actorId: number;
  method: string;
  action: string;
  resource: string;
  targetResource: string;
  targetId: number | null;
  path: string;
};

type AuditActor = { id: number; username: string; name: string | null };

export type RecordOperators = {
  createdBy: ReturnType<typeof auditActor> | null;
  updatedBy: ReturnType<typeof auditActor> | null;
};

export function auditActor(actor: AuditActor) {
  return { ...actor, displayName: actor.name ?? actor.username };
}

export function auditLogResponse<T extends { actor: AuditActor; createdAt: Date }>(log: T) {
  return {
    ...log,
    actor: auditActor(log.actor),
    createdAt: log.createdAt.toISOString(),
  };
}

export function recordOperation(input: RecordOperationInput) {
  return prisma.adminOperationLog.create({ data: input });
}

export async function listRecordOperations({
  resource,
  recordId,
  query,
}: {
  resource: string;
  recordId: number;
  query: AuditLogQuery;
}) {
  const { page, pageSize, actorId, method, action, startAt, endAt } = query;
  const createdAt =
    startAt || endAt
      ? {
          ...(startAt ? { gte: new Date(startAt) } : {}),
          ...(endAt ? { lte: new Date(endAt) } : {}),
        }
      : undefined;
  const where = {
    targetResource: resource,
    targetId: recordId,
    ...(actorId === undefined ? {} : { actorId }),
    ...(method === undefined ? {} : { method }),
    ...(action === undefined ? {} : { action }),
    ...(createdAt ? { createdAt } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.adminOperationLog.findMany({
      where,
      select: {
        id: true,
        method: true,
        action: true,
        resource: true,
        targetResource: true,
        targetId: true,
        path: true,
        createdAt: true,
        actor: { select: { id: true, username: true, name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.adminOperationLog.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

/**
 * Returns safe creator/updater display data for a resource record. Business modules
 * can use this for list/detail projections without exposing user credentials.
 */
export async function recordOperators(
  resource: string,
  recordId: number
): Promise<RecordOperators> {
  const target = { targetResource: resource, targetId: recordId };
  const actor = { select: { id: true, username: true, name: true } } as const;
  const [created, updated] = await prisma.$transaction([
    prisma.adminOperationLog.findFirst({
      where: { ...target, action: "create" },
      select: { actor },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.adminOperationLog.findFirst({
      where: { ...target, action: "update" },
      select: { actor },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  return {
    createdBy: created ? auditActor(created.actor) : null,
    updatedBy: updated ? auditActor(updated.actor) : null,
  };
}
