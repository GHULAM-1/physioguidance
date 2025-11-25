import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BigQueryService } from '../bigquery/bigquery.service';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';
import { User } from '../bigquery/interfaces/user.interface';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from './jwt.config';

@Injectable()
export class AuthService {
  constructor(private bigQueryService: BigQueryService) {}

  async register(registerDto: RegisterDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.bigQueryService.getUserByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user with LEARNER role and VIEWER privilege
    const userData = {
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      roles: [Role.LEARNER],
      privileges: {
        [Role.LEARNER]: Privilege.VIEWER,
      } as Record<Role, Privilege>,
    };

    return await this.bigQueryService.createUser(userData);
  }

  async login(loginDto: LoginDto): Promise<User> {
    const user = await this.bigQueryService.getUserByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Simple password comparison (plain text for now)
    if (user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async createUserByAdmin(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.bigQueryService.getUserByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate that privileges are provided for all roles
    for (const role of createUserDto.roles) {
      if (!createUserDto.privileges[role]) {
        throw new BadRequestException(
          `Privilege not provided for role: ${role}`,
        );
      }
    }

    return await this.bigQueryService.createUser(createUserDto);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.bigQueryService.getAllUsers();
  }

  async getUsersByDepartment(role: Role): Promise<User[]> {
    return await this.bigQueryService.getUsersByRole(role);
  }

  generateToken(user: User): string {
    const payload = {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
    };
    return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions);
  }
}
