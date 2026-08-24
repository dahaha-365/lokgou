import { fakerZH_CN as faker } from "@faker-js/faker";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { createIdentifier, resolveIdentifierMiddle } from "../src/lib/identifier";
import { seedFixtures } from "../src/test/fixtures";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) });

faker.seed(seedFixtures.seed);

async function generateAutoCode(key: string) {
  const rule = await prisma.autoCodeRule.findUniqueOrThrow({ where: { key } });
  const middle = resolveIdentifierMiddle(rule.middleTemplate);
  const counter = await prisma.autoCodeCounter.upsert({
    where: { ruleId_middle: { ruleId: rule.id, middle } },
    create: { ruleId: rule.id, middle, value: 1 },
    update: { value: { increment: 1 } },
  });
  return createIdentifier({
    prefix: rule.prefix,
    middle,
    counter: counter.value,
    length: rule.counterLength,
  });
}

const actions = ["read", "create", "update", "delete"];
const subjects = [
  "User",
  "Department",
  "DepartmentLeader",
  "Position",
  "Role",
  "Permission",
  "Menu",
  "AutoCode",
  "Dict",
  "Attachment",
  "AuditLog",
];
const fixedDates = {
  past: new Date("2024-01-15T08:00:00.000Z"),
  recent: new Date("2025-01-15T08:00:00.000Z"),
  ended: new Date("2025-06-15T08:00:00.000Z"),
  future: new Date("2030-01-15T08:00:00.000Z"),
} as const;

async function main() {
  // Delete children before their parents. Menus reference permissions by code.
  await prisma.dictItem.deleteMany();
  await prisma.dict.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.departmentRolePermission.deleteMany();
  await prisma.userRolePermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.userDepartmentRole.deleteMany();
  await prisma.departmentRole.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.departmentLeader.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.adminOperationLog.deleteMany();
  // Menu parents use Restrict, so remove the hierarchy from its leaves upward.
  while (true) {
    const leaves = await prisma.menu.findMany({
      where: { children: { none: {} } },
      select: { id: true },
    });
    if (!leaves.length) break;
    await prisma.menu.deleteMany({ where: { id: { in: leaves.map((menu) => menu.id) } } });
  }
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.autoCodeCounter.deleteMany();
  await prisma.autoCodeRule.deleteMany();

  await prisma.autoCodeRule.createMany({
    data: [
      {
        key: "USERNAME",
        prefix: "USR",
        middleTemplate: "",
        counterLength: 6,
        remark: "用户登录名自动编号",
      },
      {
        key: "DEPARTMENT_CODE",
        prefix: "DEP",
        middleTemplate: "",
        counterLength: 6,
        remark: "部门编码自动编号",
      },
      {
        key: "ATTACHMENT",
        prefix: "ATT",
        middleTemplate: "",
        counterLength: 8,
        remark: "附件业务编号",
      },
      {
        key: "POSITION_CODE",
        prefix: "POS",
        middleTemplate: "",
        counterLength: 6,
        remark: "职位编码自动编号",
      },
      {
        key: "ROLE_CODE",
        prefix: "ROL",
        middleTemplate: "",
        counterLength: 6,
        remark: "角色编码自动编号",
      },
    ],
  });

  const headquarters = await prisma.department.create({
    data: { code: await generateAutoCode("DEPARTMENT_CODE"), name: "总部", enableState: 0 },
  });
  const engineering = await prisma.department.create({
    data: {
      code: await generateAutoCode("DEPARTMENT_CODE"),
      name: "研发中心",
      parentId: headquarters.id,
      enableState: 0,
    },
  });
  const platform = await prisma.department.create({
    data: {
      code: await generateAutoCode("DEPARTMENT_CODE"),
      name: "平台工程部",
      parentId: engineering.id,
      enableState: 0,
    },
  });
  const operations = await prisma.department.create({
    data: {
      code: await generateAutoCode("DEPARTMENT_CODE"),
      name: "运营中心",
      parentId: headquarters.id,
      enableState: 0,
    },
  });

  const platformPosition = await prisma.position.create({
    data: {
      code: await generateAutoCode("POSITION_CODE"),
      name: "平台主管",
      description: "负责平台工程团队",
      enableState: 0,
    },
  });
  await prisma.position.create({
    data: {
      code: await generateAutoCode("POSITION_CODE"),
      name: "运营专员",
      description: "负责运营工作",
      enableState: 0,
    },
  });

  const passwordHash = await Bun.password.hash("demo123456");
  const admin = await prisma.user.create({
    data: {
      username: seedFixtures.admin.username,
      passwordHash: await Bun.password.hash(seedFixtures.admin.password),
      name: "系统管理员",
      email: "admin@example.com",
      enableState: 0,
      isAdmin: true,
    },
  });
  const demoAdmin = await prisma.user.create({
    data: {
      username: await generateAutoCode("USERNAME"),
      passwordHash,
      name: "演示平台主管",
      email: "demo.admin@example.com",
      mobile: "+8613800000001",
      enableState: 0,
      isAdmin: true,
    },
  });
  const activeAdmin = await prisma.user.create({
    data: {
      username: await generateAutoCode("USERNAME"),
      passwordHash,
      name: "运营管理员",
      email: "ops.admin@example.com",
      mobile: "+8613800000002",
      enableState: 0,
      isAdmin: true,
    },
  });
  const disabledAdmin = await prisma.user.create({
    data: {
      username: await generateAutoCode("USERNAME"),
      passwordHash,
      name: "已停用管理员",
      email: "disabled.admin@example.com",
      enableState: 1,
      isAdmin: true,
    },
  });
  const deletedAdmin = await prisma.user.create({
    data: {
      username: await generateAutoCode("USERNAME"),
      passwordHash,
      name: "已删除管理员",
      email: "deleted.admin@example.com",
      enableState: 0,
      isAdmin: true,
      deletedAt: fixedDates.ended,
    },
  });
  const staff = await prisma.user.create({
    data: {
      username: await generateAutoCode("USERNAME"),
      passwordHash,
      name: faker.person.fullName(),
      email: "staff@example.com",
      mobile: "+8613800000005",
      positionId: platformPosition.id,
      enableState: 0,
    },
  });

  await prisma.departmentLeader.createMany({
    data: [
      {
        userId: admin.id,
        departmentId: headquarters.id,
        role: "primary",
        startedAt: fixedDates.past,
      },
      {
        userId: demoAdmin.id,
        departmentId: engineering.id,
        role: "primary",
        startedAt: fixedDates.recent,
      },
      {
        userId: activeAdmin.id,
        departmentId: engineering.id,
        role: "deputy",
        startedAt: fixedDates.recent,
      },
      {
        userId: staff.id,
        departmentId: platform.id,
        role: "primary",
        startedAt: fixedDates.recent,
      },
      {
        userId: deletedAdmin.id,
        departmentId: operations.id,
        role: "primary",
        startedAt: fixedDates.past,
        endedAt: fixedDates.ended,
      },
    ],
  });

  await prisma.permission.createMany({
    data: subjects.flatMap((subject) =>
      actions.map((action) => ({
        code: `${subject.toUpperCase()}_${action.toUpperCase()}`,
        name: `${subject} ${action}`,
        category: "api",
        action,
        subject,
        scope: "all",
        enableState: 0,
      }))
    ),
  });
  const permissions = new Map(
    (await prisma.permission.findMany()).map((permission) => [permission.code, permission])
  );
  const permission = (code: string) => permissions.get(code)!;

  const systemViewer = await prisma.role.create({
    data: {
      code: "SYSTEM_VIEWER",
      name: "系统查看员",
      description: "查看系统管理菜单和用户",
      permissions: JSON.stringify(
        subjects.flatMap((subject) =>
          actions.map((action) => `${subject.toUpperCase()}_${action.toUpperCase()}`)
        )
      ),
      enableState: 0,
    },
  });
  const organizationManager = await prisma.role.create({
    data: {
      code: "ORGANIZATION_MANAGER",
      name: "组织管理员",
      description: "管理部门组织信息",
      permissions: JSON.stringify(["DEPARTMENT_READ", "DEPARTMENT_UPDATE"]),
      enableState: 0,
    },
  });
  const roleAuditor = await prisma.role.create({
    data: {
      code: "ROLE_AUDITOR",
      name: "角色审计员",
      description: "审计角色授权",
      permissions: JSON.stringify(["ROLE_READ"]),
      enableState: 0,
    },
  });

  const demoUserRole = await prisma.userRole.create({
    data: { userId: demoAdmin.id, roleId: systemViewer.id },
  });
  await prisma.userRole.create({
    data: { userId: activeAdmin.id, roleId: organizationManager.id },
  });
  await prisma.userRole.create({ data: { userId: disabledAdmin.id, roleId: roleAuditor.id } });

  const engineeringManager = await prisma.departmentRole.create({
    data: {
      departmentId: engineering.id,
      roleId: organizationManager.id,
      grantedPermissions: JSON.stringify(["DEPARTMENT_READ"]),
      revokedPermissions: "[]",
    },
  });
  const platformAuditor = await prisma.departmentRole.create({
    data: {
      departmentId: platform.id,
      roleId: roleAuditor.id,
      grantedPermissions: JSON.stringify(["ROLE_READ"]),
      revokedPermissions: "[]",
    },
  });
  await prisma.userDepartmentRole.createMany({
    data: [
      {
        userId: activeAdmin.id,
        departmentRoleId: engineeringManager.id,
        startedAt: fixedDates.recent,
      },
      {
        userId: activeAdmin.id,
        departmentRoleId: platformAuditor.id,
        startedAt: fixedDates.past,
        endedAt: fixedDates.ended,
      },
    ],
  });

  await prisma.rolePermission.createMany({
    data: [
      ...subjects.flatMap((subject) =>
        actions.map((action) => ({
          roleId: systemViewer.id,
          permissionId: permission(`${subject.toUpperCase()}_${action.toUpperCase()}`).id,
          effect: "allow" as const,
        }))
      ),
      {
        roleId: organizationManager.id,
        permissionId: permission("DEPARTMENT_READ").id,
        effect: "allow",
      },
      { roleId: roleAuditor.id, permissionId: permission("ROLE_READ").id, effect: "allow" },
    ],
  });
  await prisma.departmentRolePermission.createMany({
    data: [
      {
        departmentRoleId: engineeringManager.id,
        permissionId: permission("DEPARTMENT_READ").id,
        effect: "allow",
      },
      {
        departmentRoleId: engineeringManager.id,
        permissionId: permission("DEPARTMENT_UPDATE").id,
        effect: "deny",
      },
    ],
  });
  await prisma.userRolePermission.createMany({
    data: [
      { userRoleId: demoUserRole.id, permissionId: permission("ROLE_READ").id, effect: "allow" },
      { userRoleId: demoUserRole.id, permissionId: permission("ROLE_UPDATE").id, effect: "allow" },
    ],
  });
  await prisma.userPermission.createMany({
    data: [
      { userId: demoAdmin.id, permissionId: permission("PERMISSION_READ").id, effect: "allow" },
      // Direct denial overrides the same role-derived permission (activeAdmin).
      { userId: activeAdmin.id, permissionId: permission("ROLE_READ").id, effect: "deny" },
      { userId: activeAdmin.id, permissionId: permission("AUTOCODE_READ").id, effect: "allow" },
    ],
  });

  const menuGroups = [
    { code: "SYSTEM", name: "系统管理", group: "system", permissionCode: "AUTOCODE_READ" },
    {
      code: "ORGANIZATION",
      name: "组织管理",
      group: "organization",
      permissionCode: "DEPARTMENT_READ",
    },
  ];
  const resources = [
    ["users", "用户管理", "User"],
    ["departments", "部门管理", "Department"],
    ["department-leaders", "部门负责人", "DepartmentLeader"],
    ["positions", "职位管理", "Position"],
    ["roles", "角色管理", "Role"],
    ["permissions", "权限管理", "Permission"],
    ["menus", "菜单管理", "Menu"],
    ["autocode", "自动编码", "AutoCode"],
    ["dicts", "字典管理", "Dict"],
    ["attachments", "附件管理", "Attachment"],
    ["audit-logs", "审计日志", "AuditLog"],
  ] as const;
  const groupIds = new Map<string, number>();
  for (const group of menuGroups) {
    const record = await prisma.menu.create({ data: { ...group, type: "group", sortOrder: 1 } });
    groupIds.set(group.group, record.id);
  }
  for (const [index, [code, name, subject]] of resources.entries()) {
    const permissionPrefix = subject.toUpperCase();
    const groupId = groupIds.get(
      code === "departments" || code === "department-leaders" || code === "positions"
        ? "organization"
        : "system"
    )!;
    const menu = await prisma.menu.create({
      data: {
        code: `RESOURCE_${code.toUpperCase().replaceAll("-", "_")}`,
        name,
        group:
          code === "departments" || code === "department-leaders" || code === "positions"
            ? "organization"
            : "system",
        type: "menu",
        parentId: groupId,
        permissionCode: `${permissionPrefix}_READ`,
        path: `/admin/${code}`,
        component: code,
        sortOrder: index + 1,
      },
    });
    for (const [actionIndex, action] of actions.entries()) {
      await prisma.menu.create({
        data: {
          code: `RESOURCE_${code.toUpperCase().replaceAll("-", "_")}_${action.toUpperCase()}`,
          name: `${name}${action === "read" ? "查看" : action === "create" ? "新建" : action === "update" ? "编辑" : "删除"}`,
          group:
            code === "departments" || code === "department-leaders" || code === "positions"
              ? "organization"
              : "system",
          type: "button",
          parentId: menu.id,
          permissionCode: `${permissionPrefix}_${action.toUpperCase()}`,
          sortOrder: actionIndex + 1,
        },
      });
    }
  }

  const dict = await prisma.dict.create({
    data: { code: "USER_STATUS", name: "用户状态", description: "演示字典" },
  });
  await prisma.dictItem.createMany({
    data: [
      { dictId: dict.id, label: "启用", value: "0", sortOrder: 1 },
      { dictId: dict.id, label: "停用", value: "1", sortOrder: 2 },
    ],
  });
  await prisma.attachment.create({
    data: {
      code: await generateAutoCode("ATTACHMENT"),
      originalName: "seed.txt",
      storageName: "seed.txt",
      storagePath: "seed/seed.txt",
      mimeType: "text/plain",
      size: 4,
      category: "demo",
    },
  });
  await prisma.adminOperationLog.create({
    data: {
      actorId: demoAdmin.id,
      method: "GET",
      action: "read",
      resource: "users",
      targetResource: "users",
      path: "/admin/users",
    },
  });

  await prisma.userSession.createMany({
    data: [
      {
        userId: demoAdmin.id,
        refreshTokenHash: "seed-valid-demo-session",
        expiresAt: fixedDates.future,
      },
      {
        userId: activeAdmin.id,
        refreshTokenHash: "seed-revoked-session",
        expiresAt: fixedDates.future,
        revokedAt: fixedDates.ended,
      },
    ],
  });

  console.log(
    `Seeded 6 users, 4 departments, 2 positions, 3 roles, ${subjects.length * actions.length} permissions, ${2 + resources.length * 5} menus, 1 dict, 1 attachment, 1 audit log, and all assignment models.`
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
