"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const testHelpers_1 = require("./testHelpers");
// Import app after setting up mocks
const index_1 = __importDefault(require("../index"));
describe("Tag Controller", () => {
  beforeEach(() => {
    (0, testHelpers_1.clearAllMocks)();
  });
  describe("PUT /workspaces/:wsId/tags/:name", () => {
    it("should create a new tag successfully", async () => {
      const newTag = {
        id: 2,
        name: "urgent",
        workspace_id: testHelpers_1.mockWorkspaceId,
      };
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query, _params) => {
            if (query.includes("INSERT INTO tags")) {
              return Promise.resolve({
                rows: [newTag],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .put(`/workspaces/${testHelpers_1.mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(201);
      expect(response.body.tag).toBeDefined();
      expect(response.body.tag.name).toBe(newTag.name);
      expect(response.body.tag.workspace_id).toBe(
        testHelpers_1.mockWorkspaceId,
      );
    });
    it("should update existing tag successfully", async () => {
      const existingTag = {
        id: 1,
        name: "urgent",
        workspace_id: testHelpers_1.mockWorkspaceId,
      };
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query, _params) => {
            if (query.includes("INSERT INTO tags")) {
              return Promise.resolve({
                rows: [existingTag],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .put(`/workspaces/${testHelpers_1.mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(201);
      expect(response.body.tag).toBeDefined();
      expect(response.body.tag.name).toBe(existingTag.name);
    });
    it("should return 400 for invalid tag name", async () => {
      const response = await (0, supertest_1.default)(index_1.default)
        .put(`/workspaces/${testHelpers_1.mockWorkspaceId}/tags/`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(404);
    });
    it("should return 401 for missing API key", async () => {
      const response = await (0, supertest_1.default)(index_1.default).put(
        `/workspaces/${testHelpers_1.mockWorkspaceId}/tags/urgent`,
      );
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });
    it("should return 401 for invalid API key", async () => {
      testHelpers_1.mockQuery.mockImplementation((query) => {
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [],
            rowCount: 0,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .put(`/workspaces/${testHelpers_1.mockWorkspaceId}/tags/urgent`)
        .set("X-API-Key", "invalid-key");
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid API key");
    });
    it("should handle database errors gracefully", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query, _params) => {
            if (query.includes("INSERT INTO tags")) {
              throw new Error("Database connection failed");
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .put(`/workspaces/${testHelpers_1.mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });
});
//# sourceMappingURL=tagController.test.js.map
