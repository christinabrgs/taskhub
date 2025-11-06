"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const testHelpers_1 = require("./testHelpers");
// Import app after the mock is set up
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
describe("Task Controller", () => {
  beforeEach(() => {
    (0, testHelpers_1.clearAllMocks)();
    (0, testHelpers_1.setupApiKeyValidation)();
  });
  describe("POST /workspaces/:wsId/tasks", () => {
    it("should create a new task successfully", async () => {
      const newTask = {
        title: "New Task",
        description: "Task description",
        status: "todo",
      };
      // Set up a custom mock implementation that handles both calls
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (query.includes("INSERT INTO tasks")) {
              // Task creation
              return Promise.resolve({
                rows: [{ ...testHelpers_1.mockTask, ...newTask }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .post(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks`)
        .set("x-api-key", testHelpers_1.mockApiKey)
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
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)(),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .post(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks`)
        .set("x-api-key", testHelpers_1.mockApiKey)
        .send(invalidTask);
      console.log("Response status:", response.status);
      console.log("Response body:", response.body);
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
    it("should return 401 for missing API key", async () => {
      const newTask = {
        title: "New Task",
        description: "Task description",
      };
      const response = await (0, supertest_1.default)(index_1.default)
        .post(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks`)
        .send(newTask);
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing API key");
    });
  });
  describe("GET /workspaces/:wsId/tasks", () => {
    it("should get tasks successfully", async () => {
      testHelpers_1.mockQuery.mockResolvedValueOnce({
        rows: [testHelpers_1.mockTask],
        rowCount: 1,
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeDefined();
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
    it("should filter tasks by status", async () => {
      testHelpers_1.mockQuery.mockResolvedValueOnce({
        rows: [testHelpers_1.mockTask],
        rowCount: 1,
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks?status=todo`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(200);
      expect(testHelpers_1.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND tasks.status = $"),
        expect.arrayContaining([
          testHelpers_1.mockWorkspaceId,
          "todo",
          expect.any(Number),
        ]),
      );
    });
    it("should search tasks by query", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (
              query.includes("GROUP BY tasks.id ORDER BY tasks.id ASC LIMIT")
            ) {
              return Promise.resolve({
                rows: [testHelpers_1.mockTask],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks?q=test`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(200);
      expect(testHelpers_1.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "AND (tasks.title ILIKE $2 OR tasks.description ILIKE $2)",
        ),
        expect.arrayContaining([
          testHelpers_1.mockWorkspaceId,
          "%test%",
          expect.any(Number),
        ]),
      );
    });
    it("should filter tasks by tag", async () => {
      testHelpers_1.mockQuery.mockResolvedValueOnce({
        rows: [testHelpers_1.mockTask],
        rowCount: 1,
      });
      const response = await (0, supertest_1.default)(index_1.default)
        .get(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks?tag=urgent`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(200);
      expect(testHelpers_1.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND tasks.id IN"),
        expect.arrayContaining([
          testHelpers_1.mockWorkspaceId,
          "urgent",
          expect.any(Number),
        ]),
      );
    });
  });
  describe("PATCH /workspaces/:wsId/tasks/:taskId", () => {
    it("should update a task successfully", async () => {
      const updateData = {
        title: "Updated Task",
        status: "done",
      };
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (query.includes("UPDATE tasks SET")) {
              return Promise.resolve({
                rows: [{ ...testHelpers_1.mockTask, ...updateData }],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .patch(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/1`)
        .set("x-api-key", testHelpers_1.mockApiKey)
        .send(updateData);
      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.status).toBe(updateData.status);
    });
    it("should return 404 for non-existent task", async () => {
      const updateData = {
        title: "Updated Task",
      };
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (query.includes("UPDATE tasks SET")) {
              return Promise.resolve({
                rows: [],
                rowCount: 0,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .patch(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/999`)
        .set("x-api-key", testHelpers_1.mockApiKey)
        .send(updateData);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });
  describe("DELETE /workspaces/:wsId/tasks/:taskId", () => {
    it("should delete a task successfully", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (
              query.includes(
                "SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2",
              )
            ) {
              return Promise.resolve({
                rows: [testHelpers_1.mockTask],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .delete(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/1`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(204);
    });
    it("should return 404 for non-existent task", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (
              query.includes(
                "SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2",
              )
            ) {
              return Promise.resolve({
                rows: [],
                rowCount: 0,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .delete(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/999`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });
  describe("POST /workspaces/:wsId/tasks/:taskId/tags/:name", () => {
    it("should attach tag to task successfully", async () => {
      testHelpers_1.mockQuery.mockImplementation(
        (0, testHelpers_1.createMockImplementation)([
          (query) => {
            if (query.includes("INSERT INTO tags")) {
              return Promise.resolve({
                rows: [testHelpers_1.mockTag],
                rowCount: 1,
              });
            }
            if (query.includes("INSERT INTO task_tags")) {
              return Promise.resolve({
                rows: [
                  {
                    tag_id: testHelpers_1.mockTag.id,
                    task_id: testHelpers_1.mockTask.id,
                  },
                ],
                rowCount: 1,
              });
            }
            return null;
          },
        ]),
      );
      const response = await (0, supertest_1.default)(index_1.default)
        .post(
          `/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/1/tags/urgent`,
        )
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(201);
      expect(response.body.taskTag).toBeDefined();
    });
    it("should return 400 for invalid tag name", async () => {
      const response = await (0, supertest_1.default)(index_1.default)
        .post(`/workspaces/${testHelpers_1.mockWorkspaceId}/tasks/1/tags/`)
        .set("x-api-key", testHelpers_1.mockApiKey);
      expect(response.status).toBe(404);
    });
  });
});
//# sourceMappingURL=taskController.test.js.map
