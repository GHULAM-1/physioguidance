export interface MockTable {
  insert: jest.Mock;
  exists: jest.Mock;
}

export interface MockDataset {
  table: jest.Mock;
  createTable: jest.Mock;
}

export interface MockBigQuery {
  dataset: jest.Mock;
  query: jest.Mock;
}

export function createMockTable(): MockTable {
  return {
    insert: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue([true]),
  };
}

export function createMockDataset(mockTable: MockTable): MockDataset {
  return {
    table: jest.fn().mockReturnValue(mockTable),
    createTable: jest.fn().mockResolvedValue([mockTable]),
  };
}

export function createMockBigQuery(mockDataset: MockDataset): MockBigQuery {
  return {
    dataset: jest.fn().mockReturnValue(mockDataset),
    query: jest.fn().mockResolvedValue([[]]),
  };
}
