import fs from "node:fs";
const spec = JSON.parse(fs.readFileSync("openapi.json", "utf8"));
function type(s = {}) {
  if (s.$ref) return s.$ref.split("/").at(-1);
  if (s.anyOf) return s.anyOf.map(type).join(" | ");
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.type === "array") return `Array<${type(s.items)}>`;
  if (s.type === "object" && !Object.keys(s.properties ?? {}).length)
    return "Record<string, unknown>";
  if (s.type === "object")
    return `{ ${Object.entries(s.properties ?? {})
      .map(
        ([key, value]) =>
          `${JSON.stringify(key)}${s.required?.includes(key) ? "" : "?"}: ${type(value)}`,
      )
      .join("; ")} }`;
  return (
    {
      integer: "number",
      number: "number",
      string: "string",
      boolean: "boolean",
      null: "null",
    }[s.type] ?? "unknown"
  );
}
fs.mkdirSync("src/types", { recursive: true });
fs.writeFileSync(
  "src/types/api.ts",
  "// Generated from openapi.json. Run npm run api:types after updating the contract.\n" +
    Object.entries(spec.components.schemas)
      .map(([name, schema]) => `export type ${name} = ${type(schema)};`)
      .join("\n") +
    "\nexport interface PageResult<T> { items: T[]; total: number; page: number; page_size: number; }\n",
);
const resources = {};
for (const [path, operations] of Object.entries(spec.paths)) {
  if (!operations.post?.requestBody) continue;
  const name = operations.post.requestBody.content[
    "application/json"
  ].schema.$ref
    .split("/")
    .at(-1);
  const schema = spec.components.schemas[name];
  resources[path] = {
    required: schema.required ?? [],
    fields: schema.properties,
  };
}
fs.writeFileSync(
  "src/lib/api-contract.ts",
  "// Generated writable-field metadata from openapi.json.\nexport const writeContracts = " +
    JSON.stringify(resources, null, 2) +
    " as const;\n",
);
