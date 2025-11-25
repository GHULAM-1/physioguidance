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
import { User } from '../types/auth/type';
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
    const user = await this.bigQueryService.getUserByEmailWithPrivileges(
      loginDto.email,
    );

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
    return await this.bigQueryService.getAllUsersWithPrivileges();
  }

  async getUsersByDepartment(role: Role): Promise<User[]> {
    return await this.bigQueryService.getUsersByRole(role);
  }

  async updateUserByAdmin(
    userId: string,
    updateUserDto: CreateUserDto,
  ): Promise<User> {
    // Check if user exists
    const existingUser = await this.bigQueryService.getUserById(userId);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    // If email is being changed, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailConflict =
        await this.bigQueryService.getUserByEmailExcludingUserId(
          updateUserDto.email,
          userId,
        );
      if (emailConflict) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    // Handle roles and privileges update separately
    if (updateUserDto.roles && updateUserDto.privileges) {
      // Validate that privileges are provided for all roles
      for (const role of updateUserDto.roles) {
        if (!updateUserDto.privileges[role]) {
          throw new BadRequestException(
            `Privilege not provided for role: ${role}`,
          );
        }
      }

      await this.bigQueryService.updateUserRolesAndPrivileges(
        userId,
        updateUserDto.roles,
        updateUserDto.privileges,
      );
    }

    // Update basic user fields (name, email, password)
    const updateData: Partial<User> = {};
    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.email !== undefined)
      updateData.email = updateUserDto.email;
    if (updateUserDto.password !== undefined && updateUserDto.password !== '') {
      updateData.password = updateUserDto.password;
    }

    if (Object.keys(updateData).length > 0) {
      return await this.bigQueryService.updateUser(userId, updateData);
    }

    // Return updated user
    return (await this.bigQueryService.getUserById(userId)) as User;
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.bigQueryService.getUserById(userId);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    await this.bigQueryService.deleteUser(userId);
  }

  generateToken(user: User): string {
    const payload = {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
    };
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    } as jwt.SignOptions);
  }
}
