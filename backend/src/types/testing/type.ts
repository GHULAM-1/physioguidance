export type MockTable = {
  insert: jest.Mock;
  exists: jest.Mock;
};

export type MockDataset = {
  table: jest.Mock;
  createTable: jest.Mock;
};

export type MockBigQuery = {
  dataset: jest.Mock;
  query: jest.Mock;
};
