import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    userId: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    roles: [Role.LEARNER],
    privileges: { [Role.LEARNER]: Privilege.VIEWER },
    created_at: '2024-01-01',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      generateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      const registerDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      authService.register.mockResolvedValueOnce(mockUser);
      authService.generateToken.mockReturnValueOnce(mockToken);

      const result = await controller.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(result.token).toBe(mockToken);
      expect(result.data).not.toHaveProperty('password');
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should not include password in response', async () => {
      const registerDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      authService.register.mockResolvedValueOnce(mockUser);
      authService.generateToken.mockReturnValueOnce(mockToken);

      const result = await controller.register(registerDto);

      expect(result.data).not.toHaveProperty('password');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('email');
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.login.mockResolvedValueOnce(mockUser);
      authService.generateToken.mockReturnValueOnce(mockToken);

      const result = await controller.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.token).toBe(mockToken);
      expect(result.data).not.toHaveProperty('password');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should not include password in response', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.login.mockResolvedValueOnce(mockUser);
      authService.generateToken.mockReturnValueOnce(mockToken);

      const result = await controller.login(loginDto);

      expect(result.data).not.toHaveProperty('password');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user without password', async () => {
      const result = await controller.getCurrentUser(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('password');
      expect(result.data.userId).toBe(mockUser.userId);
    });
  });

  describe('getAvailableRoles', () => {
    it('should return all available roles', async () => {
      const result = await controller.getAvailableRoles();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data).toContain(Role.USER);
      expect(result.data).toContain(Role.ADMIN);
      expect(result.data).toContain(Role.FINANCE);
      expect(result.data).toContain(Role.LEARNER);
    });

    it('should return roles from ENUM', async () => {
      const result = await controller.getAvailableRoles();

      const expectedRoles = Object.values(Role);
      expect(result.data).toEqual(expectedRoles);
    });
  });

  describe('getAvailablePrivileges', () => {
    it('should return all available privileges', async () => {
      const result = await controller.getAvailablePrivileges();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data).toContain(Privilege.VIEWER);
      expect(result.data).toContain(Privilege.EDITOR);
    });

    it('should return privileges from ENUM', async () => {
      const result = await controller.getAvailablePrivileges();

      const expectedPrivileges = Object.values(Privilege);
      expect(result.data).toEqual(expectedPrivileges);
    });
  });
});
