// Test the mock directly
import { mockQuery } from "./testHelpers";
import db from "../db/connection";

describe("Debug Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have the mock working", () => {
    expect(mockQuery).toBeDefined();
    expect(typeof mockQuery).toBe("function");
  });

  it("should mock the database query", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const result = await db.query("SELECT * FROM test");

    expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM test");
    expect(result.rows).toEqual([{ id: 1 }]);
  });
});
