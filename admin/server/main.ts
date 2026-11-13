import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { deployStack } from "./dockhand.ts";
import { GitHubClient } from "./github.ts";
import { Publisher } from "./publisher.ts";

const config = loadConfig();
const github = new GitHubClient({
  token: config.githubToken,
  repo: config.repo,
  branch: config.branch,
});
const { dockhand } = config;
const publisher = new Publisher({
  workflowRun: (commit) => github.workflowRun(config.workflowFile, commit),
  deploy: dockhand ? () => deployStack(dockhand) : undefined,
});

const app = createApp({
  github,
  publisher,
  info: { repo: config.repo, branch: config.branch, deploys: !!dockhand },
  password: config.password,
  staticDir: config.staticDir,
});

createServer((req, res) => void app(req, res)).listen(config.port, () => {
  console.log(
    `Admin linktree : http://localhost:${config.port} → ${config.repo}@${config.branch}`,
  );
  if (!config.password) {
    console.warn("ADMIN_PASSWORD absent : l'interface n'est PAS protégée.");
  }
});
