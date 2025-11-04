import request from "supertest";
import {
  mockQuery,
  createMockImplementation,
  mockApiKey,
  mockWorkspaceId,
} from "./testHelpers";

// Import app after setting up mocks
import app from "../server";

describe("Tag Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT /workspaces/:wsId/tags/:name", () => {
    it("should create a new tag successfully", async () => {
      const newTag = {
        id: 2,
        name: "urgent",
        workspace_id: mockWorkspaceId,
      };

      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string, _params: any[]) => {
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

      const response = await request(app)
        .put(`/workspaces/${mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(201);
      expect(response.body.tag).toBeDefined();
      expect(response.body.tag.name).toBe(newTag.name);
      expect(response.body.tag.workspace_id).toBe(mockWorkspaceId);
    });

    it("should update existing tag successfully", async () => {
      const existingTag = {
        id: 1,
        name: "urgent",
        workspace_id: mockWorkspaceId,
      };

      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string, _params: any[]) => {
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

      const response = await request(app)
        .put(`/workspaces/${mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(201);
      expect(response.body.tag).toBeDefined();
      expect(response.body.tag.name).toBe(existingTag.name);
    });

    it("should return 400 for invalid tag name", async () => {
      const response = await request(app)
        .put(`/workspaces/${mockWorkspaceId}/tags/`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(404);
    });

    it("should return 401 for missing API key", async () => {
      const response = await request(app).put(
        `/workspaces/${mockWorkspaceId}/tags/urgent`,
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });

    it("should return 401 for invalid API key", async () => {
      mockQuery.mockImplementation((query: string) => {
        if (query.includes("SELECT id, workspace_id FROM api_keys")) {
          return Promise.resolve({
            rows: [],
            rowCount: 0,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const response = await request(app)
        .put(`/workspaces/${mockWorkspaceId}/tags/urgent`)
        .set("X-API-Key", "invalid-key");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid API key");
    });

    it("should handle database errors gracefully", async () => {
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string, _params: any[]) => {
            if (query.includes("INSERT INTO tags")) {
              throw new Error("Database connection failed");
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .put(`/workspaces/${mockWorkspaceId}/tags/urgent`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });
  });
});
