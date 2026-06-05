import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  return execSync(cmd, { cwd: root, stdio: "inherit", encoding: "utf8" });
}

try {
  if (!existsSync(join(root, ".git"))) {
    run("git init");
  }
  run("git add -A");
  run('git commit -F scripts/commit-message.txt');
  console.log("\nLocal save OK — no remote, nothing pushed.");
} catch (err) {
  if (String(err.stdout || err.message).includes("nothing to commit")) {
    console.log("Already saved — nothing new to commit.");
  } else {
    throw err;
  }
}
