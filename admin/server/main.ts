import { createServer } from "node:http";
import { createApp } from "./app.ts";
import { AuthService } from "./auth.ts";
import { loadConfig } from "./config.ts";
import { deployStack } from "./dockhand.ts";
import { GitHubClient } from "./github.ts";
import { Publisher } from "./publisher.ts";

const config = loadConfig();
const settings = { repo: config.repo, branch: config.branch };
const { dockhand } = config;
const publisher = new Publisher({
  deploy: dockhand ? () => deployStack(dockhand) : undefined,
});

const app = createApp({
  githubFor: (token) => new GitHubClient({ ...settings, token }),
  auth: new AuthService({
    clientId: config.githubClientId,
    repo: config.repo,
  }),
  publisher,
  info: { repo: config.repo, branch: config.branch, deploys: !!dockhand },
  workflowFile: config.workflowFile,
  staticDir: config.staticDir,
});

createServer((req, res) => void app(req, res)).listen(config.port, () => {
  console.log(
    `Admin linktree : http://localhost:${config.port} → ${config.repo}@${config.branch}`,
  );
});
