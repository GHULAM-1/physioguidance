import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../jwt.config';
import { BigQueryService } from '../../bigquery/bigquery.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private bigQueryService: BigQueryService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue without user (guards will handle)
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as {
        userId: string;
        email: string;
        roles: string[];
      };

      // Fetch full user from database to ensure up-to-date info
      const user = await this.bigQueryService.getUserById(decoded.userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user to request object
      req['user'] = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
