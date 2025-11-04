"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
describe('App Endpoints', () => {
    it('should respond to the /test endpoint', async () => {
        const response = await (0, supertest_1.default)(index_1.default).get('/test');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Test endpoint is working!');
    });
});
//# sourceMappingURL=apptest.js.map