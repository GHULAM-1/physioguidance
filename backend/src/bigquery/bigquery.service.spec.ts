import { Test, TestingModule } from '@nestjs/testing';
import { BigQueryService } from './bigquery.service';
import { BigQuery } from '@google-cloud/bigquery';
import { Role } from './enums/roles.enum';
import { Privilege } from './enums/privilege.enum';

// Mock BigQuery
jest.mock('@google-cloud/bigquery');

describe('BigQueryService', () => {
  let service: BigQueryService;
  let mockBigQuery: jest.Mocked<BigQuery>;
  let mockDataset: any;
  let mockTable: any;

  beforeEach(async () => {
    // Create mock instances
    mockTable = {
      insert: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue([true]),
    };

    mockDataset = {
      table: jest.fn().mockReturnValue(mockTable),
      createTable: jest.fn().mockResolvedValue([mockTable]),
    };

    mockBigQuery = {
      dataset: jest.fn().mockReturnValue(mockDataset),
      query: jest.fn().mockResolvedValue([[]]),
    } as any;

    (BigQuery as jest.MockedClass<typeof BigQuery>).mockImplementation(
      () => mockBigQuery,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [BigQueryService],
    }).compile();

    service = module.get<BigQueryService>(BigQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully with roles and privileges', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      };

      mockTable.insert.mockResolvedValue([]);

      const result = await service.createUser(userData);

      expect(result).toHaveProperty('userId');
      expect(result.name).toBe(userData.name);
      expect(result.email).toBe(userData.email);
      expect(mockTable.insert).toHaveBeenCalled();
    });

    it('should throw error if user creation fails', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      };

      mockTable.insert.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(service.createUser(userData)).rejects.toThrow(
        'Insert failed',
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when email exists', async () => {
      const mockUser = {
        userId: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.USER],
        created_at: '2024-01-01',
      };

      mockBigQuery.query.mockResolvedValueOnce([[mockUser]]);

      const result = await service.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockBigQuery.query).toHaveBeenCalled();
    });

    it('should return null when email does not exist', async () => {
      mockBigQuery.query.mockResolvedValueOnce([[]]);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when userId exists', async () => {
      const mockUser = {
        userId: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.USER],
        created_at: '2024-01-01',
      };

      mockBigQuery.query.mockResolvedValueOnce([[mockUser]]);

      const result = await service.getUserById('test-id');

      expect(result).toEqual(mockUser);
    });

    it('should return null when userId does not exist', async () => {
      mockBigQuery.query.mockResolvedValueOnce([[]]);

      const result = await service.getUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });


  describe('getUserPrivilegeForRole', () => {
    it('should return privilege when user has role', async () => {
      mockBigQuery.query.mockResolvedValueOnce([
        [{ privilege: Privilege.EDITOR }],
      ]);

      const result = await service.getUserPrivilegeForRole(
        'test-user-id',
        Role.ADMIN,
      );

      expect(result).toBe(Privilege.EDITOR);
    });

    it('should return null when user does not have role', async () => {
      mockBigQuery.query.mockResolvedValueOnce([[]]);

      const result = await service.getUserPrivilegeForRole(
        'test-user-id',
        Role.ADMIN,
      );

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user name', async () => {
      const mockUpdatedUser = {
        userId: 'test-id',
        name: 'Updated Name',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.USER],
        created_at: '2024-01-01',
      };

      mockBigQuery.query
        .mockResolvedValueOnce([[]]) // UPDATE query
        .mockResolvedValueOnce([[mockUpdatedUser]]); // SELECT query

      const result = await service.updateUser('test-id', {
        name: 'Updated Name',
      });

      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error if no fields to update', async () => {
      await expect(service.updateUser('test-id', {})).rejects.toThrow(
        'No fields to update',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user from all role tables and users table', async () => {
      const mockUser = {
        userId: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.ADMIN, Role.FINANCE],
        created_at: '2024-01-01',
      };

      mockBigQuery.query
        .mockResolvedValueOnce([[mockUser]]) // getUserById
        .mockResolvedValueOnce([[]]) // DELETE from admin
        .mockResolvedValueOnce([[]]) // DELETE from finance
        .mockResolvedValueOnce([[]]); // DELETE from users

      await service.deleteUser('test-id');

      expect(mockBigQuery.query).toHaveBeenCalledTimes(4);
    });

    it('should throw error if user not found', async () => {
      mockBigQuery.query.mockResolvedValueOnce([[]]); // getUserById returns null

      await expect(service.deleteUser('nonexistent-id')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          roles: [Role.USER],
        },
        {
          userId: 'user2',
          name: 'User 2',
          email: 'user2@example.com',
          roles: [Role.ADMIN],
        },
      ];

      mockBigQuery.query.mockResolvedValueOnce([mockUsers]);

      const result = await service.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no users', async () => {
      mockBigQuery.query.mockResolvedValueOnce([[]]);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getAllUsersWithPrivileges', () => {
    it('should return users with their privileges', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          roles: [Role.ADMIN],
        },
      ];

      mockBigQuery.query
        .mockResolvedValueOnce([mockUsers]) // getAllUsers
        .mockResolvedValueOnce([[{ privilege: Privilege.EDITOR }]]); // getUserPrivilegeForRole

      const result = await service.getAllUsersWithPrivileges();

      expect(result[0]).toHaveProperty('privileges');
      expect(result[0].privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
    });
  });

  describe('getUsersByRole', () => {
    it('should return users with specific role', async () => {
      const mockUsers = [
        {
          userId: 'user1',
          name: 'Admin User',
          email: 'admin@example.com',
          roles: [Role.ADMIN],
        },
      ];

      mockBigQuery.query.mockResolvedValueOnce([mockUsers]);

      const result = await service.getUsersByRole(Role.ADMIN);

      expect(result).toEqual(mockUsers);
    });
  });
});
