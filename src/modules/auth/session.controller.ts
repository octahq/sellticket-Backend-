import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto, UpdateSessionPermissionsDto, RotateSessionKeyDto } from './dto/session.dto';
import { User } from './entities/auth.entity';

@ApiTags('Session Management')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  createSession(@Body() dto: CreateSessionDto, user: User) {
    return this.sessionService.createSession(user, dto);
  }

  @Patch(':id/permissions')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdateSessionPermissionsDto) {
    return this.sessionService.updateSessionPermissions(id, dto);
  }

  @Post(':id/rotate')
  rotateKey(@Param('id') id: string, @Body() dto: RotateSessionKeyDto) {
    return this.sessionService.rotateSessionKey(id);
  }

  @Delete(':id')
  revokeSession(@Param('id') id: string) {
    return this.sessionService.revokeSession(id);
  }
}