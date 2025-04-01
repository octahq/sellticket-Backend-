import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtUtil } from '../utils/jwt.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      this.logger.warn('Token not found in the request headers');
      throw new UnauthorizedException('Token not found');
    }

    try {
      const decoded = JwtUtil.verifyToken(token);
      this.logger.log(`Token verified successfully for user: ${decoded}`);
      request.user = decoded;
      return true;
    } catch (err) {
      this.logger.error('Token verification failed', err.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
