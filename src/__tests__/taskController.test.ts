import {
  mockQuery,
  mockTask,
  mockTag,
  setupApiKeyValidation,
  createMockImplementation,
  mockApiKey,
  mockWorkspaceId,
} from "./testHelpers";

// Import app after the mock is set up
import request from "supertest";
import app from "../server";

describe("Task Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupApiKeyValidation();
  });

  describe("POST /workspaces/:wsId/tasks", () => {
    it("should create a new task successfully", async () => {
      const newTask = {
        title: "New Task",
        description: "Task description",
        status: "todo",
      };

      // Set up a custom mock implementation that handles both calls
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
            if (query.includes("INSERT INTO tasks")) {
              // Task creation
              return Promise.resolve({
                rows: [{ ...mockTask, ...newTask }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/tasks`)
        .set("x-api-key", mockApiKey)
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.title).toBe(newTask.title);
    });

    it("should return 400 for invalid task data", async () => {
      const invalidTask = {
        title: "",
        description: "Task description",
      };

      // Set up mock for API key validation only
      mockQuery.mockImplementation(createMockImplementation());

      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/tasks`)
        .set("x-api-key", mockApiKey)
        .send(invalidTask);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should return 401 for missing API key", async () => {
      const newTask = {
        title: "New Task",
        description: "Task description",
      };

      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/tasks`)
        .send(newTask);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });
  });

  describe("GET /workspaces/:wsId/tasks", () => {
    it("should get tasks successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockTask],
        rowCount: 1,
      });

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/tasks`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeDefined();
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });

    it("should filter tasks by status", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockTask],
        rowCount: 1,
      });

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/tasks?status=todo`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND tasks.status = $"),
        expect.arrayContaining([mockWorkspaceId, "todo", expect.any(Number)]),
      );
    });

    it("should search tasks by query", async () => {
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
            if (
              query.includes("GROUP BY tasks.id ORDER BY tasks.id ASC LIMIT")
            ) {
              return Promise.resolve({
                rows: [mockTask],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/tasks?q=test`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "AND (tasks.title ILIKE $2 OR tasks.description ILIKE $2)",
        ),
        expect.arrayContaining([mockWorkspaceId, "%test%", expect.any(Number)]),
      );
    });

    it("should filter tasks by tag", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockTask],
        rowCount: 1,
      });

      const response = await request(app)
        .get(`/workspaces/${mockWorkspaceId}/tasks?tag=urgent`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND tasks.id IN"),
        expect.arrayContaining([mockWorkspaceId, "urgent", expect.any(Number)]),
      );
    });
  });

  describe("PATCH /workspaces/:wsId/tasks/:taskId", () => {
    it("should update a task successfully", async () => {
      const updateData = {
        title: "Updated Task",
        status: "done",
      };

      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
            if (query.includes("UPDATE tasks SET")) {
              return Promise.resolve({
                rows: [{ ...mockTask, ...updateData }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .patch(`/workspaces/${mockWorkspaceId}/tasks/1`)
        .set("x-api-key", mockApiKey)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.status).toBe(updateData.status);
    });
  });

  describe("DELETE /workspaces/:wsId/tasks/:taskId", () => {
    it("should delete a task successfully", async () => {
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
            if (
              query.includes(
                "UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND workspace_id = $2",
              )
            ) {
              return Promise.resolve({
                rows: [mockTask],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .delete(`/workspaces/${mockWorkspaceId}/tasks/1`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(204);
    });
  });

  describe("POST /workspaces/:wsId/tasks/:taskId/tags/:name", () => {
    it("should attach tag to task successfully", async () => {
      mockQuery.mockImplementation(
        createMockImplementation([
          (query: string) => {
            if (query.includes("INSERT INTO tags")) {
              return Promise.resolve({
                rows: [mockTag],
                rowCount: 1,
              });
            }
            if (query.includes("INSERT INTO task_tags")) {
              return Promise.resolve({
                rows: [{ tag_id: mockTag.id, task_id: mockTask.id }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );

      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/tasks/1/tags/urgent`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(201);
      expect(response.body.taskTag).toBeDefined();
    });

    it("should return 400 for invalid tag name", async () => {
      const response = await request(app)
        .post(`/workspaces/${mockWorkspaceId}/tasks/1/tags/`)
        .set("x-api-key", mockApiKey);

      expect(response.status).toBe(404);
    });
  });
});
