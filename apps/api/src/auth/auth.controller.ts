import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthUser } from '@job-hunter/shared';
import { Public } from '../common/decorators/public.decorator';
import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SESSION_COOKIE_NAME } from './session-auth.guard';
import type { AuthenticatedUser } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and start a session' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const user = await this.authService.validateCredentials(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const { token, expiresAt } = await this.authService.createSession(user.id);
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      domain: this.config.cookieDomain,
      path: '/',
      expires: expiresAt,
    });

    return { username: user.username, createdAt: new Date().toISOString() };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the current session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ loggedOut: boolean }> {
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
    if (token) await this.authService.destroySession(token);
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      domain: this.config.cookieDomain,
      path: '/',
    });
    return { loggedOut: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the signed-in user' })
  me(@CurrentUser() user: AuthenticatedUser): AuthUser {
    return { username: user.username, createdAt: new Date().toISOString() };
  }
}
