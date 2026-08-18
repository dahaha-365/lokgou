import { fakerZH_CN as faker } from "@faker-js/faker";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedFixtures } from "../src/test/fixtures";
import { createIdentifier, resolveIdentifierMiddle } from "../src/lib/identifier";

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

async function main() {
  await prisma.departmentLeader.deleteMany();
  await prisma.userSession.deleteMany();
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
    ],
  });

  const departments = [];
  for (let index = 0; index < 4; index += 1) {
    departments.push(
      await prisma.department.create({
        data: {
          code: await generateAutoCode("DEPARTMENT_CODE"),
          name: index === 0 ? "总部" : faker.company.name(),
          enableState: 0,
        },
      })
    );
  }

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

  const users = [];
  for (let index = 0; index < 12; index += 1) {
    users.push(
      await prisma.user.create({
        data: {
          username: await generateAutoCode("USERNAME"),
          passwordHash: await Bun.password.hash(faker.internet.password({ length: 16 })),
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          mobile: faker.phone.number({ style: "international" }),
          enableState: 0,
        },
      })
    );
  }

  await Promise.all(
    departments.map((department, index) =>
      prisma.departmentLeader.create({
        data: {
          userId: index === 0 ? admin.id : users[index - 1]!.id,
          departmentId: department.id,
          role: "primary",
          startedAt: faker.date.past({ years: 1 }),
        },
      })
    )
  );

  console.log(`Seeded ${departments.length} departments and ${users.length + 1} users.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
