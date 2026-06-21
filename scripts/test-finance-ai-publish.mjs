import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
} catch {
  /* optional */
}

const { buildStrategiesPublishPayload } = await import(
  "../src/server/services/finance-ai-strategies-export.ts"
);
const { publishStrategies, publishAnalysisFramework } = await import(
  "../src/server/services/finance-ai-client.ts"
);
const { buildAnalysisFrameworkPublishPayload } = await import(
  "../src/server/services/finance-ai-framework-export.ts"
);

console.log("FINANCE_AI_API_URL", process.env.FINANCE_AI_API_URL);
console.log(
  "FINANCE_AI_API_KEY length",
  process.env.FINANCE_AI_API_KEY?.length,
  "starts with quote?",
  process.env.FINANCE_AI_API_KEY?.startsWith('"')
);

const payload = await buildStrategiesPublishPayload();
console.log(
  "strategies payload bytes",
  JSON.stringify(payload).length,
  "playbooks",
  payload.playbooks.length
);
const t0 = Date.now();
const strategiesResult = await publishStrategies(payload);
console.log("strategies ms", Date.now() - t0, strategiesResult);

const fw = buildAnalysisFrameworkPublishPayload();
const t1 = Date.now();
const fwResult = await publishAnalysisFramework(fw);
console.log("framework ms", Date.now() - t1, fwResult);
