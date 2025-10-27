"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const tagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "name cannot be empty"),
    workspaceId: zod_1.z.string().min(1, "workspaceId cannot be empty"),
});
//# sourceMappingURL=tagController.js.map