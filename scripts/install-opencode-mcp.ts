const projectRoot = import.meta.dir.replace(/\\scripts$/, "").replace(/\\/g, "/");
const home = process.env.USERPROFILE?.replace(/\\/g, "/");

if (!home) throw new Error("USERPROFILE is required to locate the OpenCode configuration.");

const configDirectory = `${home}/.config/opencode`;
const jsoncPath = `${configDirectory}/opencode.jsonc`;
const jsonPath = `${configDirectory}/opencode.json`;
const sourcePath = (await Bun.file(jsoncPath).exists()) ? jsoncPath : jsonPath;
const source = (await Bun.file(sourcePath).exists()) ? await Bun.file(sourcePath).text() : "{}";

function removeJsonComments(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
}

const config = JSON.parse(removeJsonComments(source)) as Record<string, unknown>;
const mcp = (config.mcp && typeof config.mcp === "object" ? config.mcp : {}) as Record<
  string,
  unknown
>;

mcp["lokgou-dev"] = {
  type: "local",
  command: [process.execPath, `${projectRoot}/packages/dev-mcp/src/index.ts`],
  cwd: projectRoot,
  enabled: true,
};

config.$schema ??= "https://opencode.ai/config.json";
config.mcp = mcp;

await Bun.write(sourcePath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Configured lokgou-dev MCP in ${sourcePath}`);
