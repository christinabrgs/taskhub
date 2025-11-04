"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = __importDefault(require("."));
const dotenv_1 = __importDefault(require("dotenv"));
const connection_1 = require("./db/connection");
dotenv_1.default.config();
async function startServer() {
    await (0, connection_1.connectToDB)();
    let port = process.env.PORT || 5000;
    _1.default.listen(port, () => console.log(`Server is running on port ${process.env.PORT}`));
}
startServer();
//# sourceMappingURL=server.js.map