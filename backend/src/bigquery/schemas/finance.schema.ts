export const financeTableSchema = [
  { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
  { name: 'privilege', type: 'STRING', mode: 'REQUIRED' }, // EDITOR or VIEWER
  { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
];

export const financeTableId = 'finance';
