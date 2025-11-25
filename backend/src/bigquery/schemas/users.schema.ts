export const usersTableSchema = [
  { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
  { name: 'email', type: 'STRING', mode: 'REQUIRED' },
  { name: 'password', type: 'STRING', mode: 'REQUIRED' },
  { name: 'roles', type: 'STRING', mode: 'REPEATED' }, // Array of role strings
  { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
];

export const usersTableId = 'users';
