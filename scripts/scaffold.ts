import { existsSync } from "node:fs";
import { join } from "node:path";

const [kind, ...names] = process.argv.slice(2);
const modulesDirectory = "apps/api/src/modules";

function fail(message: string): never {
  throw new Error(
    `${message}\n\nUsage:\n  bun run scaffold:module <kebab-case-name>\n  bun run scaffold:submodule <parent> <kebab-case-name>`
  );
}

function validateName(name: string | undefined, label: string): string {
  if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    fail(`${label} must use kebab-case.`);
  }
  return name;
}

function pascalCase(name: string): string {
  return name.replace(/(?:^|-)([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

function camelCase(name: string): string {
  const pascal = pascalCase(name);
  return pascal[0]!.toLowerCase() + pascal.slice(1);
}

async function writeFile(path: string, content: string): Promise<void> {
  if (existsSync(path)) fail(`${path} already exists.`);
  await Bun.write(path, content);
}

async function addTopLevelModule(name: string): Promise<void> {
  const moduleDirectory = join(modulesDirectory, name);
  const variable = camelCase(name);
  const controllerPath = join(moduleDirectory, `${name}.controller.ts`);
  const routesPath = join(moduleDirectory, "routes.ts");

  await writeFile(
    controllerPath,
    `import { Elysia } from "elysia";\nimport { ${variable}Routes } from "./routes";\n\nexport const ${variable}Controller = new Elysia({ prefix: "/${name}" }).use(${variable}Routes);\n`
  );
  await writeFile(
    routesPath,
    `import { Elysia } from "elysia";\n\nexport const ${variable}Routes = new Elysia();\n`
  );

  const appPath = "apps/api/src/app.ts";
  const appSource = await Bun.file(appPath).text();
  const importLine = `import { ${variable}Controller } from "./modules/${name}/${name}.controller";`;
  const updatedSource = appSource
    .replace(
      'import { adminController } from "./modules/admin/admin.controller";',
      `import { adminController } from "./modules/admin/admin.controller";\n${importLine}`
    )
    .replace("  .use(adminController);", `  .use(adminController)\n  .use(${variable}Controller);`);

  if (updatedSource === appSource)
    fail("Could not find the module registration anchor in apps/api/src/app.ts.");
  await Bun.write(appPath, updatedSource);
}

async function addSubmodule(parent: string, name: string): Promise<void> {
  const parentDirectory = join(modulesDirectory, parent);
  const routesPath = join(parentDirectory, "routes.ts");
  const submoduleDirectory = join(parentDirectory, name);
  const variable = camelCase(name);
  const pascal = pascalCase(name);
  const controllerPath = join(submoduleDirectory, `${name}.controller.ts`);

  if (!existsSync(routesPath)) fail(`Parent module "${parent}" does not have routes.ts.`);
  await writeFile(
    controllerPath,
    `import { Elysia } from "elysia";\n\nexport const ${variable}Controller = new Elysia({ prefix: "/${name}" }).get("/", () => ({\n  message: "${pascal} route is ready"\n}));\n`
  );
  await writeFile(
    join(submoduleDirectory, `${name}.service.ts`),
    `export const ${variable}Service = {};\n`
  );

  const routesSource = await Bun.file(routesPath).text();
  const importLine = `import { ${variable}Controller } from "./${name}/${name}.controller";`;
  const updatedSource = routesSource
    .replace(/import \{ Elysia \} from "elysia";\n/, (line) => `${line}${importLine}\n`)
    .replace(/;\n$/, `.use(${variable}Controller);\n`);
  if (updatedSource === routesSource) fail(`Could not update ${routesPath}.`);
  await Bun.write(routesPath, updatedSource);
}

if (kind === "module" && names.length === 1) {
  await addTopLevelModule(validateName(names[0], "Module name"));
} else if (kind === "submodule" && names.length === 2) {
  await addSubmodule(
    validateName(names[0], "Parent module name"),
    validateName(names[1], "Submodule name")
  );
} else {
  fail("Invalid scaffold command.");
}
