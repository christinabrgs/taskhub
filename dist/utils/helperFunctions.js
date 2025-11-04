"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInteger = isInteger;
function isInteger(req, res) {
    const num = Number(req.params.wsId);
    if (!Number.isInteger(num)) {
        return res.status(400).json({ error: `Invalid workspace ID: ${req.params.wsId}` });
    }
    return num;
}
//# sourceMappingURL=helperFunctions.js.map