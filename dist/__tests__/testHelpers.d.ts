import { Pool } from "pg";
export declare const mockQuery: jest.Mock<any, any, any>;
declare const mockPool: jest.Mocked<Pool>;
export declare const mockApiKey = "test-api-key-123";
export declare const mockWorkspaceId = 1;
export declare const mockApiKeyId = 1;
export declare const mockHashedApiKey: string;
export declare const mockWorkspace: {
  id: number;
  name: string;
};
export declare const mockTask: {
  id: number;
  title: string;
  description: string;
  status: string;
  due_date: null;
  workspace_id: number;
  created_by: number;
  deleted_at: null;
};
export declare const mockTag: {
  id: number;
  name: string;
  workspace_id: number;
};
export declare const clearAllMocks: () => void;
export declare const setupApiKeyValidation: () => void;
export declare const createMockImplementation: (
  additionalHandlers?: ((query: string, params: any[]) => any)[],
) => (query: string, params: any[]) => any;
export { mockPool };
//# sourceMappingURL=testHelpers.d.ts.map
