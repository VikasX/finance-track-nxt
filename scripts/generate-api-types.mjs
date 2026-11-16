/*
 * scripts/generate-api-types.mjs
 * Developer-only generator, run with npm run api:types. It reads openapi.json and writes API types plus writable-field metadata; edit the source contract rather than generated output.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Use Node filesystem access for this developer script; browser components cannot read repository files this way.
import fs from "node:fs";
// Read the backend OpenAPI contract from disk. This generator runs in Node, not inside a browser component.
const spec = JSON.parse(fs.readFileSync("openapi.json", "utf8"));
// Recursively translate OpenAPI schema shapes into TypeScript text. References/unions/enums/arrays/required fields must preserve the contract in generated files.
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
// Write type declarations to the generated output. These comment additions explain this generator only; generated files are deliberately left byte-for-byte unchanged.
fs.writeFileSync(
  "src/types/api.ts",
  "// Generated from openapi.json. Run npm run api:types after updating the contract.\n" +
    Object.entries(spec.components.schemas)
      .map(([name, schema]) => `export type ${name} = ${type(schema)};`)
      .join("\n") +
    "\nexport interface PageResult<T> { items: T[]; total: number; page: number; page_size: number; }\n",
);
// Allowed finance resources or the collection names this operation processes; keeping the list explicit avoids arbitrary endpoint traversal.
const resources = {};
// Inspect POST schemas to discover each resource writable creation fields. The shared editor uses this metadata rather than blindly sending read-response fields.
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
