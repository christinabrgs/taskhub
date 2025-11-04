"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Test the mock directly
const testHelpers_1 = require("./testHelpers");
const connection_1 = __importDefault(require("../db/connection"));
describe("Debug Test", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should have the mock working", () => {
        expect(testHelpers_1.mockQuery).toBeDefined();
        expect(typeof testHelpers_1.mockQuery).toBe("function");
    });
    it("should mock the database query", async () => {
        testHelpers_1.mockQuery.mockResolvedValue({
            rows: [{ id: 1 }],
            rowCount: 1,
        });
        const result = await connection_1.default.query("SELECT * FROM test");
        expect(testHelpers_1.mockQuery).toHaveBeenCalledWith("SELECT * FROM test");
        expect(result.rows).toEqual([{ id: 1 }]);
    });
});
//# sourceMappingURL=debug.test.js.map