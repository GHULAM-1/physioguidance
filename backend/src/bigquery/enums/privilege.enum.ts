export enum Privilege {
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Helper function to validate privilege
export function isValidPrivilege(privilege: string): privilege is Privilege {
  return Object.values(Privilege).includes(privilege as Privilege);
}
