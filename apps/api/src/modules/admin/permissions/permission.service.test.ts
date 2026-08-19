import { describe, expect, test } from "bun:test";
import { AbilityBuilder } from "@casl/ability";
import { createPrismaAbility, type AppAbility } from "../../../lib/casl-prisma";

describe("permission precedence", () => {
  test("higher-priority user rules override user-role, department-role, and role rules", () => {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    can("read", "User"); // global role
    cannot("read", "User"); // department role
    can("read", "User"); // user role
    cannot("read", "User"); // direct user permission

    expect(build().can("read", "User")).toBeFalse();
  });

  test("manager scope is represented as a Prisma relation condition", () => {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);
    can("read", "User", {
      departmentRoles: {
        some: {
          endedAt: null,
          departmentRole: {
            department: { leaders: { some: { userId: 7, endedAt: null } } },
          },
        },
      },
    });

    expect(build().can("read", "User")).toBeTrue();
  });
});
