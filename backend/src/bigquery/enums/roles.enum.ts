export enum Role {
  USER = 'USER',
  LEARNER = 'LEARNER',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
}

// Helper function to get table name from role
export function getRoleTableName(role: Role): string {
  return role.toLowerCase();
}

// Helper function to validate role
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role);
}
