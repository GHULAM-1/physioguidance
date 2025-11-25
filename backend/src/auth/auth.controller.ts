import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { Roles } from './decorators/roles.decorator';
import { RequirePrivilege } from './decorators/privilege.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';
import type { User } from '../bigquery/interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    const token = this.authService.generateToken(user);
    // Don't return password
    const { password, ...result } = user;
    return {
      success: true,
      message: 'User registered successfully',
      data: result,
      token: token,
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto);
    const token = this.authService.generateToken(user);

    const { password, ...result } = user;
    return {
      success: true,
      message: 'Login successful',
      data: result,
      token: token,
    };
  }

  @Post('admin/create-user')
  @UseGuards(AuthGuard, RolesGuard, PrivilegeGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege(Privilege.EDITOR)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.createUserByAdmin(createUserDto);
    const { password, ...result } = user;
    return {
      success: true,
      message: 'User created successfully',
      data: result,
    };
  }

  @Get('admin/users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllUsers() {
    const users = await this.authService.getAllUsers();
    // Remove passwords from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    return {
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    };
  }

  @Get('admin/department/:role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsersByDepartment(@Param('role') role: string) {
    // Validate role
    if (!Object.values(Role).includes(role as Role)) {
      return {
        success: false,
        message: 'Invalid role specified',
      };
    }

    const users = await this.authService.getUsersByDepartment(role as Role);
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    return {
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() user: User) {
    const { password, ...result } = user;
    return {
      success: true,
      data: result,
    };
  }

  @Get('roles')
  async getAvailableRoles() {
    // Return all roles from the ENUM - this is the single source of truth
    return {
      success: true,
      data: Object.values(Role),
    };
  }

  @Get('privileges')
  async getAvailablePrivileges() {
    // Return all privileges from the ENUM
    return {
      success: true,
      data: Object.values(Privilege),
    };
  }

  @Put('admin/users/:userId')
  @UseGuards(AuthGuard, RolesGuard, PrivilegeGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege(Privilege.EDITOR)
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: CreateUserDto,
  ) {
    const user = await this.authService.updateUserByAdmin(
      userId,
      updateUserDto,
    );
    const { password, ...result } = user;
    return {
      success: true,
      message: 'User updated successfully',
      data: result,
    };
  }

  @Delete('admin/users/:userId')
  @UseGuards(AuthGuard, RolesGuard, PrivilegeGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege(Privilege.EDITOR)
  async deleteUser(@Param('userId') userId: string) {
    await this.authService.deleteUserByAdmin(userId);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
