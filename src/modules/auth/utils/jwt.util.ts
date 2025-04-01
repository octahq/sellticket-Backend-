import { JwtService } from '@nestjs/jwt';

export class JwtUtil {
  private static jwtService = new JwtService({
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '24h' },
  });

  static verifyToken(token: string) {
    return this.jwtService.verify(token);
  }

  static signToken(payload: any) {
    return this.jwtService.sign(payload);
  }
}
