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
const validateAPIKey_1 = require("../middleware/validateAPIKey");
const tagSchema = zod_1.z.object({
  name: zod_1.z.string().min(1, "name cannot be empty"),
});
async function upsertTag(req, res) {
  // TODO: Same suggestions as the other two controller about checking the number, typing,
  const wsId = res.locals.wsId;
  const name = req.params.name;
  const body = tagSchema.parse({ name });
  try {
    const result = await connection_1.default.query(
      // logical thing to do here would be to DO NOTHING but we want to return the value
      `INSERT INTO tags (name, workspace_id) VALUES ($1, $2) ON CONFLICT (name, workspace_id) DO UPDATE SET name = EXCLUDED.name RETURNING *;`,
      [body.name, wsId],
    );
    res.status(201).json({ tag: result.rows[0] });
  } catch (error) {
    if (error instanceof zod_1.z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error upserting tag:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
const tagRouter = (0, express_1.Router)({ mergeParams: true });
tagRouter.put("/:name", validateAPIKey_1.validateApiKey, upsertTag);
exports.default = tagRouter;
//# sourceMappingURL=tagController.js.map
