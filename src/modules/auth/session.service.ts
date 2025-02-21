// src/auth/session.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionKeySigner } from '@account-kit/smart-contracts';
import { AlchemyAAService } from '../common/utils/alchemy';
import { SessionKeyPermissionsBuilder } from '@account-kit/smart-contracts';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';

@Injectable()
export class SessionService {
  constructor(
    private alchemyAAService: AlchemyAAService,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  /**
   * Creates a new session with permissions and stores it in the database
   * @param user Authenticated user entity
   * @param createSessionDto Session configuration parameters
   * @returns Created session details
   */
  async createSession(user: User, createSessionDto: CreateSessionDto) {
    const mainClient = await this.alchemyAAService.getAuthenticatedClient();
    const extendedClient = mainClient.extend(sessionKeyPluginActions);

    // Generate session key
    const sessionKey = new SessionKeySigner();
    const sessionAddress = await sessionKey.getAddress();

    // Create session entity
    const session = this.sessionRepository.create({
      sessionKey: sessionAddress,
      permissions: {
        spendLimit: createSessionDto.spendLimit.toString(),
        validUntil: new Date(Date.now() + createSessionDto.validSeconds * 1000),
        contractAllowList: createSessionDto.contractAllowList
      },
      user,
      isActive: true
    });

    // Install plugin if needed
    if (!await this.isPluginInstalled(extendedClient)) {
      await this.installPlugin(extendedClient, sessionKey, createSessionDto);
    }

    // Save session
    await this.sessionRepository.save(session);
    
    return {
      id: session.id,
      sessionKey: sessionAddress,
      validUntil: session.permissions.validUntil,
      spendLimit: session.permissions.spendLimit
    };
  }

  private async isPluginInstalled(client: any) {
    // ... existing implementation
  }

  private async installPlugin(client: any, sessionKey: SessionKeySigner, dto: CreateSessionDto) {
    // ... existing implementation
  }

  /**
   * Rotates session keys while maintaining permissions
   * @param sessionId ID of the session to rotate
   * @returns New session key details
   */
  async rotateSessionKey(sessionId: string) {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException('Session not found');

    const mainClient = await this.alchemyAAService.getAuthenticatedClient();
    
    // Generate new key
    const newKey = new SessionKeySigner();
    const newAddress = await newKey.getAddress();

    // Update database
    session.sessionKey = newAddress;
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    // Rotate on-chain
    await mainClient.rotateSessionKey({
      oldKey: session.sessionKey,
      newKey: newAddress
    });

    return {
      newSessionKey: newAddress,
      validUntil: session.permissions.validUntil
    };
  }

  /**
   * Updates permissions for an existing session
   * @param sessionId ID of the session to update
   * @param updateDto New permission parameters
   */
  async updateSessionPermissions(sessionId: string, updateDto: UpdateSessionPermissionsDto) {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException('Session not found');

    const mainClient = await this.alchemyAAService.getAuthenticatedClient();
    
    // Update permissions
    const builder = new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: BigInt(updateDto.spendLimit) });

    await mainClient.updateSessionKeyPermissions({
      key: session.sessionKey,
      permissions: builder.encode()
    });

    // Update database
    session.permissions.spendLimit = updateDto.spendLimit.toString();
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    return { message: 'Permissions updated successfully' };
  }

  /**
   * Revokes an active session
   * @param sessionId ID of the session to revoke
   */
  async revokeSession(sessionId: string) {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException('Session not found');

    const mainClient = await this.alchemyAAService.getAuthenticatedClient();
    
    // Revoke on-chain
    await mainClient.removeSessionKey({ key: session.sessionKey });
    
    // Update database
    session.isActive = false;
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    return { message: 'Session revoked successfully' };
  }
}