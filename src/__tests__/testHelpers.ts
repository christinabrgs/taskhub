import { Pool } from "pg";
import crypto from "crypto";

// Create the mock at the top level
export const mockQuery = jest.fn();

const mockPool = {
  query: mockQuery,
} as unknown as jest.Mocked<Pool>;

// Mock the database connection module before any imports that use it
jest.mock("../db/connection", () => ({
  __esModule: true,
  default: mockPool,
}));

// Export test data and helpers
export const mockApiKey = "test-api-key-123";
export const mockWorkspaceId = 1;
export const mockApiKeyId = 1;

// Generate the hashed version of the API key to match what the middleware does
export const mockHashedApiKey = crypto
  .createHash("sha256")
  .update(mockApiKey)
  .digest("hex");

export const mockWorkspace = {
  id: mockWorkspaceId,
  name: "Test Workspace",
};

export const mockTask = {
  id: 1,
  title: "Test Task",
  description: "Test Description",
  status: "todo",
  due_date: null,
  workspace_id: mockWorkspaceId,
  created_by: mockApiKeyId,
  deleted_at: null,
};

export const mockTag = {
  id: 1,
  name: "Test Tag",
  workspace_id: mockWorkspaceId,
};

export const setupApiKeyValidation = () => {
  // Clear any existing mocks
  mockQuery.mockReset();

  // Set up the default response for API key validation
  mockQuery.mockImplementation(createMockImplementation());
};

export const createMockImplementation = (
  additionalHandlers: ((query: string, params: any[]) => any)[] = [],
) => {
  return (query: string, params: any[]) => {
    // First, handle API key validation
    if (
      query.includes("SELECT id, workspace_id FROM api_keys") &&
      mockHashedApiKey === params[0] &&
      mockWorkspaceId === params[1]
    ) {
      return Promise.resolve({
        rows: [{ id: mockApiKeyId, workspace_id: mockWorkspaceId }],
        rowCount: 1,
      });
    }

    // Handle workspace validation
    if (
      query.includes("SELECT * FROM workspaces WHERE id = $1") &&
      params[0] === mockWorkspaceId
    ) {
      return Promise.resolve({
        rows: [mockWorkspace],
        rowCount: 1,
      });
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

// Re-export for use in tests
export { mockPool };
