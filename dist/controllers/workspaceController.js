"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../db/connection"));
const express_1 = require("express");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const validateAPIKey_1 = require("../middleware/validateAPIKey");
const workspaceSchema = zod_1.z.object({
  name: zod_1.z.string().min(1, "Workspace name cannot be empty"),
});
async function createWorkspace(req, res) {
  try {
    // TODO: Look into the `safeParse` method if you want to reduce the size of the `catch` block and instead do an early return
    const body = workspaceSchema.parse(req.body);
    const result = await connection_1.default.query(
      "INSERT INTO workspaces (name) VALUES ($1) RETURNING *",
      [body.name],
    );
    res.status(201).json({ workspace: result.rows[0] });
  } catch (error) {
    if (error instanceof zod_1.z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function generateAPIKey(_req, res) {
  const wsId = res.locals.wsId;
  const body = crypto_1.default.randomBytes(16).toString("hex") + wsId;
  const key = crypto_1.default.createHash("sha256").update(body).digest("hex");
  try {
    // FIXME: This is a little confusing, maybe try to reword it a little more succinctly
    // in both generateAPIKey and getStatsForWorkspace we are doing additional querying that might cause issues with performance, for now it works
    // ideally we would create more extensive error handling in the catch blocks based on unique instances
    const workspace = await connection_1.default.query(
      "SELECT * FROM workspaces WHERE id = $1",
      [wsId],
    );
    if (!workspace.rows.length)
      return res.status(404).json({ error: "Workspace not found" });
    const result = await connection_1.default.query(
      "INSERT into api_keys (workspace_id, key) VALUES ($1, $2) RETURNING id",
      [wsId, key],
    );
    res.status(201).json({ apiKey: body, id: result.rows[0] });
  } catch (error) {
    console.error("Error generating APIKey", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getStatsForWorkspace(_req, res) {
  try {
    const wsId = res.locals.wsId;
    const workspace = await connection_1.default.query(
      "SELECT * FROM workspaces WHERE id = $1",
      [wsId],
    );
    if (!workspace.rows.length)
      return res.status(404).json({ error: "Workspace not found" });
    const countStatus = await connection_1.default.query(
      "SELECT status, COUNT(*) FROM tasks WHERE workspace_id = $1 GROUP BY status",
      [wsId],
    );
    const topTags = await connection_1.default.query(
      "SELECT t.name, COUNT(*) as tag_count FROM task_tags tt JOIN tags t ON tt.tag_id = t.id JOIN tasks ta ON tt.task_id = ta.id WHERE ta.workspace_id = $1 GROUP BY t.name ORDER BY tag_count DESC LIMIT 5",
      [wsId],
    );
    const overdueTasks = await connection_1.default.query(
      "SELECT COUNT(*) FROM tasks WHERE workspace_id = $1 AND due_date < NOW() AND status != 'done'",
      [wsId],
    );
    res.status(200).json({
      stats: countStatus.rows,
      topTags: topTags.rows,
      overdueTasks: overdueTasks.rows[0].count,
    });
  } catch (error) {
    console.error("Error getting stats for workspace", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
// Routers
const workspaceRouter = (0, express_1.Router)();
workspaceRouter.post("/", createWorkspace);
workspaceRouter.post(
  "/:wsId/apikeys",
  validateAPIKey_1.validateWsId,
  generateAPIKey,
);
workspaceRouter.get(
  "/:wsId/stats",
  validateAPIKey_1.validateWsId,
  validateAPIKey_1.validateApiKey,
  getStatsForWorkspace,
);
exports.default = workspaceRouter;
//# sourceMappingURL=workspaceController.js.map
