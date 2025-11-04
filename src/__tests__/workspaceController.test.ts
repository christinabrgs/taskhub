import request from "supertest";
import {
  mockQuery,
  setupApiKeyValidation,
  createMockImplementation,
  mockApiKey,
  mockWorkspaceId,
  mockWorkspace,
} from "./testHelpers";

// Import app after setting up mocks
import app from "../server";
import { DatabaseError } from "pg";

describe("Workspace Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupApiKeyValidation();
  });

  describe("POST /workspaces", () => {
    it("should create a new workspace successfully", async () => {
      const newWorkspace = {
        name: "New Workspace",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, name: newWorkspace.name }],
        rowCount: 1,
      });

      const response = await request(app)
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

      const response = await request(app)
        .post("/workspaces")
        .send(invalidWorkspace);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /workspaces/:wsId/apikeys", () => {
    it("should generate API key successfully", async () => {
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
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

      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/apikeys`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(201);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.id).toBeDefined();
    });

    it("should return 404 for non-existent workspace", async () => {
      const err = new DatabaseError("fk constraint error I guess", 69, "error")
      err.code = '23503'
      mockQuery.mockRejectedValueOnce(err);

      const response = await request(app).post("/workspaces/999/apikeys");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Workspace not found");
    });

    it("should return 400 for invalid workspace ID", async () => {
      const response = await request(app).post("/workspaces/invalid/apikeys");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid workspace ID");
    });
  });

  describe("GET /workspaces/:wsId/stats", () => {
    beforeEach(() => {
      mockQuery.mockImplementation((query: string) => {
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [{ id: 1, workspace_id: mockWorkspaceId }],
            rowCount: 1,
          });
        }
        if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
          return Promise.resolve({
            rows: [mockWorkspace],
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

      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string, _params: any[]) => {
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

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/stats`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(200);
      expect(response.body.stats).toEqual(mockStats);
      expect(response.body.topTags).toEqual(mockTopTags);
      expect(response.body.overdueTasks).toBe("2");
    });

    it("should return 404 for non-existent workspace", async () => {
      mockQuery.mockImplementation((query: string, _params: any[]) => {
        // API key validation should pass
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [{ id: 1, workspace_id: mockWorkspaceId }],
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

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/stats`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Workspace not found");
    });

    it("should return 401 for missing API key", async () => {
      const response = await request(app).get(
        `/workspaces/${mockWorkspaceId}/stats`,
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });
  });
});
