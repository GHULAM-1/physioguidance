import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { AuthGuard } from './guards/auth.guard';
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
    const { password: _password, ...result } = user;
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

    const { password: _password, ...result } = user;
    return {
      success: true,
      message: 'Login successful',
      data: result,
      token: token,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getCurrentUser(@CurrentUser() user: User) {
    const { password: _password, ...result } = user;
    return {
      success: true,
      data: result,
    };
  }

  @Get('roles')
  getAvailableRoles() {
    // Return all roles from the ENUM - this is the single source of truth
    return {
      success: true,
      data: Object.values(Role),
    };
  }

  @Get('privileges')
  getAvailablePrivileges() {
    // Return all privileges from the ENUM
    return {
      success: true,
      data: Object.values(Privilege),
    };
  }
}
