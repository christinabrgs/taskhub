"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
exports.validateWsId = validateWsId;
const connection_1 = __importDefault(require("../db/connection"));
const crypto_1 = __importDefault(require("crypto"));
async function validateApiKey(req, res, next) {
    try {
        const apiKey = req.headers["x-api-key"];
        const wsId = Number(req.params.wsId);
        if (!apiKey) {
            return res.status(401).json({ error: "Missing API key" });
        }
        if (typeof apiKey !== "string") {
            return res.status(401).json({ error: "API key is not of type String" });
        }
        const key = crypto_1.default.createHash("sha256").update(apiKey).digest("hex"); // using lower saltOrRounds value to ensure faster processing
        console.log(apiKey, key);
        // Find API key in DB
        const apiKeyRecord = await connection_1.default.query(`SELECT id, workspace_id FROM api_keys WHERE key = $1 AND workspace_id = $2`, [key, wsId]);
        if (apiKeyRecord.rowCount === 0) {
            return res.status(401).json({ error: "Invalid API key" });
        }
        res.locals.apiKey = apiKeyRecord.rows[0];
        res.locals.wsId = wsId;
        next();
    }
    catch (error) {
        console.error("Error validating API key:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
async function validateWsId(req, res, next) {
    const num = Number(req.params.wsId);
    if (!Number.isInteger(num)) {
        return res
            .status(400)
            .json({ error: `Invalid workspace ID: ${req.params.wsId}` });
    }
    res.locals.wsId = num;
    next();
}
//# sourceMappingURL=validateAPIKey.js.map