import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const modulesDirectory = "apps/api/src/modules";
const templatesDirectory = resolve("scripts/scaffold-templates");
const [, , command, ...arguments_] = process.argv;

function fail(message: string): never {
  throw new Error(
    `${message}\n\nUsage:\n  bun run scaffold module <path> [--model Model]\n  bun run scaffold submodule <parent> <path> [--model Model]`
  );
}

function validateName(name: string, label: string): string {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) fail(`${label} must use kebab-case.`);
  return name;
}

function pascalCase(name: string): string {
  return name.replace(/(?:^|-)([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelCase(name: string): string {
  const value = pascalCase(name);
  return value[0]!.toLowerCase() + value.slice(1);
}

async function template(name: string, values: Record<string, string>): Promise<string> {
  let source = await Bun.file(join(templatesDirectory, name)).text();
  for (const [key, value] of Object.entries(values))
    source = source.replaceAll(`{{${key}}}`, value);
  return source;
}

async function writeFile(path: string, content: string): Promise<void> {
  if (existsSync(path)) fail(`${path} already exists.`);
  await Bun.write(path, content);
}

function option(name: string): string | undefined {
  const index = arguments_.indexOf(name);
  return index >= 0 ? arguments_[index + 1] : undefined;
}

async function addTopLevel(name: string, model?: string) {
  const directory = join(modulesDirectory, name);
  const values = {
    name,
    camel: camelCase(name),
    pascal: pascalCase(name),
    modelCamel: model ? camelCase(model) : "model",
  };
  await writeFile(
    join(directory, `${name}.controller.ts`),
    await template("module.controller.ts.tmpl", values)
  );
  await writeFile(join(directory, "routes.ts"), await template("module.routes.ts.tmpl", values));
  const appPath = "apps/api/src/app.ts";
  const appSource = await Bun.file(appPath).text();
  const importLine = `import { ${values.camel}Controller } from "./modules/${name}/${name}.controller";`;
  const updated = appSource
    .replace(
      'import { adminController } from "@api/admin/admin.controller";',
      (line) => `${line}\n${importLine}`
    )
    .replace(
      "  .use(adminController);",
      `  .use(adminController)\n  .use(${values.camel}Controller);`
    );
  if (updated === appSource) fail("Could not find app registration anchor.");
  await Bun.write(appPath, updated);
}

async function addSubmodule(parent: string, path: string, model?: string) {
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((part) => validateName(part, "Module name"));
  if (!parts.length) fail("Submodule path is required.");
  const name = parts.at(-1)!;
  const parentDirectory = join(modulesDirectory, parent, ...parts.slice(0, -1));
  const directory = join(parentDirectory, name);
  const routesPath = join(parentDirectory, "routes.ts");
  if (!existsSync(routesPath)) fail(`Parent module "${parent}" does not have routes.ts.`);
  const values = {
    name,
    camel: camelCase(name),
    pascal: pascalCase(name),
    modelCamel: model ? camelCase(model) : "model",
  };
  await writeFile(
    join(directory, `${name}.controller.ts`),
    await template("submodule.controller.ts.tmpl", values)
  );
  await writeFile(
    join(directory, `${name}.service.ts`),
    await template("submodule.service.ts.tmpl", values)
  );
  const routesSource = await Bun.file(routesPath).text();
  const updated = routesSource
    .replace(
      /import \{ Elysia \} from "elysia";\n/,
      (line) => `${line}${await template("submodule.routes-import.tmpl", values)}\n`
    )
    .replace(/;\n$/, `.use(${values.camel}Controller);\n`);
  if (updated === routesSource) fail(`Could not update ${routesPath}.`);
  await Bun.write(routesPath, updated);
}

const model = option("--model");
if (command === "module" && arguments_.filter((value) => !value.startsWith("--")).length === 1)
  await addTopLevel(
    validateName(
      arguments_.find((value) => !value.startsWith("--"))!,
      "Module name"
    ),
    model
  );
else if (command === "submodule") {
  const positional = arguments_.filter((value) => !value.startsWith("--"));
  if (positional.length !== 2) fail("Submodule requires parent and path.");
  await addSubmodule(validateName(positional[0]!, "Parent module name"), positional[1]!, model);
} else fail("Invalid scaffold command.");
