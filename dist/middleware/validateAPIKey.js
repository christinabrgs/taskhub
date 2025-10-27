"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
const connection_1 = __importDefault(require("../db/connection"));
async function validateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(401).json({ error: 'Missing or invalid API key' });
        }
        // Find API key in DB
        const apiKeyRecord = await connection_1.default.query(`SELECT id, workspace_id FROM api_keys WHERE key = $1 & workspace_id = $2`, [apiKey, req.params.wsId]);
        if (apiKeyRecord.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        res.locals.apiKey = apiKeyRecord.rows[0];
        next();
    }
    catch (error) {
        console.error('Error validating API key:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=validateAPIKey.js.map