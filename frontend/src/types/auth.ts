export enum Role {
  USER = 'USER',
  LEARNER = 'LEARNER',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
}

export enum Privilege {
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export type User = {
  userId: string;
  name: string;
  email: string;
  roles: Role[];
  created_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  privileges: Record<Role, Privilege>;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  data?: User;
};

export type UsersListResponse = {
  success: boolean;
  data: User[];
  count: number;
};
