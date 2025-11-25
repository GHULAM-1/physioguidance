import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/auth/create-user.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { Roles } from './decorators/roles.decorator';
import { RequirePrivilege } from './decorators/privilege.decorator';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';

@Controller('admin')
export class AdminController {
  constructor(private authService: AuthService) {}

  @Post('create-user')
  @UseGuards(AuthGuard, RolesGuard, PrivilegeGuard)
  @Roles(Role.ADMIN)
  @RequirePrivilege(Privilege.EDITOR)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.createUserByAdmin(createUserDto);
    const { password: _password, ...result } = user;
    return {
      success: true,
      message: 'User created successfully',
      data: result,
    };
  }

  @Get('users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllUsers() {
    const users = await this.authService.getAllUsers();
    // Remove passwords from response
    const sanitizedUsers = users.map(
      ({ password: _password, ...user }) => user,
    );
    return {
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    };
  }

  @Get('department/:role')
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
    const sanitizedUsers = users.map(
      ({ password: _password, ...user }) => user,
    );
    return {
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length,
    };
  }

  @Put('users/:userId')
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
    const { password: _password, ...result } = user;
    return {
      success: true,
      message: 'User updated successfully',
      data: result,
    };
  }

  @Delete('users/:userId')
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
