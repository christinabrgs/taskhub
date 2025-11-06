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
describe("Workspace Controller", () => {
  beforeEach(() => {
    (0, testHelpers_1.clearAllMocks)();
    (0, testHelpers_1.setupApiKeyValidation)();
  });
  describe("POST /workspaces", () => {
    it("should create a new workspace successfully", async () => {
      const newWorkspace = {
        name: "New Workspace",
      };
      testHelpers_1.mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, name: newWorkspace.name }],
        rowCount: 1,
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .post("/workspaces")
        .send(newWorkspace);
      expect(response.status).toBe(201);
      expect(response.body.workspace).toBeDefined();
      expect(response.body.workspace.name).toBe(newWorkspace.name);
    });
    it("should return 400 for invalid workspace data", async () => {
      const invalidWorkspace = {
        name: "",
      };
      const response = await (0, supertest_1.default)(index_1.default)
        .post("/workspaces")
        .send(invalidWorkspace);
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
  describe("POST /workspaces/:wsId/apikeys", () => {
    it("should generate API key successfully", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
              return Promise.resolve({
                rows: [testHelpers_1.mockWorkspace],
                rowCount: 1,
              });
            }
            if (query.includes("INSERT into api_keys")) {
              return Promise.resolve({
                rows: [{ id: 1 }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .post(`/workspaces/${testHelpers_1.mockWorkspaceId}/apikeys`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(201);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.id).toBeDefined();
    });
    it("should return 404 for non-existent workspace", async () => {
      testHelpers_1.mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      const response = await (0, supertest_1.default)(index_1.default).post(
        "/workspaces/999/apikeys",
      );
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Workspace not found");
    });
    it("should return 400 for invalid workspace ID", async () => {
      const response = await (0, supertest_1.default)(index_1.default).post(
        "/workspaces/invalid/apikeys",
      );
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid workspace ID");
    });
  });
  describe("GET /workspaces/:wsId/stats", () => {
    beforeEach(() => {
      testHelpers_1.mockQuery.mockImplementation((query) => {
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [{ id: 1, workspace_id: testHelpers_1.mockWorkspaceId }],
            rowCount: 1,
          });
        }
        if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
          return Promise.resolve({
            rows: [testHelpers_1.mockWorkspace],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
    });
    it("should get workspace stats successfully", async () => {
      const mockStats = [
        { status: "todo", count: "5" },
        { status: "done", count: "3" },
      ];
      const mockTopTags = [
        { name: "urgent", tag_count: "3" },
        { name: "bug", tag_count: "2" },
      ];
      const mockOverdueTasks = [{ count: "2" }];
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query, _params) => {
            if (
              query.includes(
                "SELECT status, COUNT(*) FROM tasks WHERE workspace_id = $1 GROUP BY status",
              )
            ) {
              return Promise.resolve({
                rows: mockStats,
                rowCount: 2,
              });
            }
            if (query.includes("SELECT t.name, COUNT")) {
              return Promise.resolve({
                rows: mockTopTags,
                rowCount: 2,
              });
            }
            if (
              query.includes(
                "SELECT COUNT(*) FROM tasks WHERE workspace_id = $1 AND due_date < NOW() AND status != 'done'",
              )
            ) {
              return Promise.resolve({
                rows: mockOverdueTasks,
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/stats`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(200);
      expect(response.body.stats).toEqual(mockStats);
      expect(response.body.topTags).toEqual(mockTopTags);
      expect(response.body.overdueTasks).toBe("2");
    });
    it("should return 404 for non-existent workspace", async () => {
      testHelpers_1.mockQuery.mockImplementation((query, _params) => {
        // API key validation should pass
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [{ id: 1, workspace_id: testHelpers_1.mockWorkspaceId }],
            rowCount: 1,
          });
        }
        // Workspace lookup should fail
        if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
          return Promise.resolve({
            rows: [],
            rowCount: 0,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/stats`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Workspace not found");
    });
    it("should return 401 for missing API key", async () => {
      const response = await (0, supertest_1.default)(index_1.default).get(
        `/workspaces/${testHelpers_1.mockWorkspaceId}/stats`,
      );
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });
  });
});
//# sourceMappingURL=workspaceController.test.js.map
