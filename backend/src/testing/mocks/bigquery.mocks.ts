import { MockTable, MockDataset, MockBigQuery } from '../../types/testing/type';

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
