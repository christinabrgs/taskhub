"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const workspaceController_1 = __importDefault(require("./controllers/workspaceController"));
const taskController_1 = __importDefault(require("./controllers/taskController"));
const tagController_1 = __importDefault(require("./controllers/tagController"));
const validateAPIKey_1 = require("./middleware/validateAPIKey");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/workspaces", workspaceController_1.default);
app.use("/workspaces/:wsId/tasks", validateAPIKey_1.validateWsId, taskController_1.default);
app.use("/workspaces/:wsId/tags", validateAPIKey_1.validateWsId, tagController_1.default);
app.get("/test", (_req, res) => {
    res.send("Test endpoint is working!");
});
exports.default = app;
//# sourceMappingURL=index.js.map