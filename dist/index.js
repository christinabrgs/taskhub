"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const connection_1 = require("./db/connection");
const workspaceController_1 = __importDefault(require("./controllers/workspaceController"));
const taskController_1 = __importDefault(require("./controllers/taskController"));
const tagController_1 = __importDefault(require("./controllers/tagController"));
dotenv_1.default.config();
(0, connection_1.connectToDB)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/workspaces", workspaceController_1.default);
app.use("/workspaces/:wsId/tasks", taskController_1.default);
app.use("/workspaces/:wsId/tags", tagController_1.default);
app.get("/test", (req, res) => {
    res.send("Test endpoint is working!");
});
let port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
//# sourceMappingURL=index.js.map