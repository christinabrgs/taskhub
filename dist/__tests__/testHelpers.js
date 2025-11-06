"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPool =
  exports.createMockImplementation =
  exports.setupApiKeyValidation =
  exports.clearAllMocks =
  exports.mockTag =
  exports.mockTask =
  exports.mockWorkspace =
  exports.mockHashedApiKey =
  exports.mockApiKeyId =
  exports.mockWorkspaceId =
  exports.mockApiKey =
  exports.mockQuery =
    void 0;
const crypto_1 = __importDefault(require("crypto"));
// Create the mock at the top level
exports.mockQuery = jest.fn();
const mockPool = {
  query: exports.mockQuery,
};
exports.mockPool = mockPool;
// Mock the database connection module before any imports that use it
jest.mock("../db/connection", () => ({
  __esModule: true,
  default: mockPool,
}));
// Export test data and helpers
exports.mockApiKey = "test-api-key-123";
exports.mockWorkspaceId = 1;
exports.mockApiKeyId = 1;
// Generate the hashed version of the API key to match what the middleware does
exports.mockHashedApiKey = crypto_1.default
  .createHash("sha256")
  .update(exports.mockApiKey)
  .digest("hex");
exports.mockWorkspace = {
  id: exports.mockWorkspaceId,
  name: "Test Workspace",
};
exports.mockTask = {
  id: 1,
  title: "Test Task",
  description: "Test Description",
  status: "todo",
  due_date: null,
  workspace_id: exports.mockWorkspaceId,
  created_by: exports.mockApiKeyId,
  deleted_at: null,
};
exports.mockTag = {
  id: 1,
  name: "Test Tag",
  workspace_id: exports.mockWorkspaceId,
};
const clearAllMocks = () => {
  jest.clearAllMocks();
};
exports.clearAllMocks = clearAllMocks;
const setupApiKeyValidation = () => {
  // Clear any existing mocks
  exports.mockQuery.mockReset();
  // Set up the default response for API key validation
  exports.mockQuery.mockImplementation((query, params) => {
    if (query.includes("SELECT id, workspace_id FROM api_keys")) {
      // The middleware will hash the API key, so we need to check for the hashed version
      const providedHashedKey = params[0];
      const workspaceId = params[1];
      console.log("setupApiKeyValidation - API key validation:", {
        providedHashedKey,
        expectedHashedKey: exports.mockHashedApiKey,
        workspaceId,
        expectedWorkspaceId: exports.mockWorkspaceId,
        keyMatch: providedHashedKey === exports.mockHashedApiKey,
        workspaceMatch: workspaceId === exports.mockWorkspaceId,
      });
      // If the workspace ID matches our mock workspace, validate the API key
      if (
        workspaceId === exports.mockWorkspaceId &&
        providedHashedKey === exports.mockHashedApiKey
      ) {
        return Promise.resolve({
          rows: [
            { id: exports.mockApiKeyId, workspace_id: exports.mockWorkspaceId },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
      if (params[0] === exports.mockWorkspaceId) {
        return Promise.resolve({
          rows: [exports.mockWorkspace],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Default fallback for any other queries
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
};
exports.setupApiKeyValidation = setupApiKeyValidation;
const createMockImplementation = (additionalHandlers = []) => {
  return (query, params) => {
    // First, handle API key validation
    if (query.includes("SELECT id, workspace_id FROM api_keys")) {
      const providedHashedKey = params[0];
      const workspaceId = params[1];
      if (
        workspaceId === exports.mockWorkspaceId &&
        providedHashedKey === exports.mockHashedApiKey
      ) {
        return Promise.resolve({
          rows: [
            { id: exports.mockApiKeyId, workspace_id: exports.mockWorkspaceId },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Handle workspace validation
    if (query.includes("SELECT * FROM workspaces WHERE id = $1")) {
      if (params[0] === exports.mockWorkspaceId) {
        return Promise.resolve({
          rows: [exports.mockWorkspace],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Try additional handlers
    for (const handler of additionalHandlers) {
      const result = handler(query, params);
      if (result) {
        return result;
      }
    }
    // Default fallback
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
};
exports.createMockImplementation = createMockImplementation;
//# sourceMappingURL=testHelpers.js.map
