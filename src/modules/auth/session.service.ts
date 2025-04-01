import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlchemyAAService } from '../../common/utils/alchemy';
import { Session } from './entities/session.entity';
import { User } from './entities/auth.entity';
import { CreateSessionDto, UpdateSessionPermissionsDto } from './dto/session.dto';

@Injectable()
export class SessionService {
  private modules: Record<string, any> = {};

  constructor(
    private alchemyAAService: AlchemyAAService,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  private async loadModules() {
    if (!this.modules.SessionKeySigner) {
      const [
        { SessionKeySigner, SessionKeyPermissionsBuilder, SessionKeyPlugin, SessionKeyAccessListType, sessionKeyPluginActions },
        { zeroHash }
      ] = await Promise.all([
        import('@account-kit/smart-contracts'),
        import('viem')
      ]);

      Object.assign(this.modules, { 
        SessionKeySigner, SessionKeyPermissionsBuilder, SessionKeyPlugin, 
        SessionKeyAccessListType, sessionKeyPluginActions, zeroHash 
      });
    }
    return this.modules;
  }

  async createSession(user: User, dto: CreateSessionDto) {
    const [client, modules] = await Promise.all([
      this.alchemyAAService.getAuthenticatedClient(),
      this.loadModules()
    ]);
    const extendedClient = client.extend(modules.sessionKeyPluginActions);

    const sessionKey = new modules.SessionKeySigner();
    const sessionAddress = await sessionKey.getAddress();

    const session = this.sessionRepository.create({
      sessionKey: sessionAddress,
      permissions: {
        spendLimit: dto.spendLimit.toString(),
        validUntil: new Date(Date.now() + dto.validSeconds * 1000),
        contractAllowList: dto.contractAllowList
      },
      user,
      isActive: true
    });

    if (!await this.isPluginInstalled(extendedClient)) {
      await this.installPlugin(extendedClient, sessionKey, dto);
    }

    await this.sessionRepository.save(session);
    return { id: session.id, sessionKey: sessionAddress, ...session.permissions };
  }

  private async isPluginInstalled(client: any) {
    const { SessionKeyPlugin } = await this.loadModules();
    return client.getInstalledPlugins({})
      .then((plugins) => plugins.includes(SessionKeyPlugin.meta.addresses[client.chain.id]));
  }

  private async installPlugin(client: any, sessionKey: any, dto: CreateSessionDto) {
    const { SessionKeyPermissionsBuilder, SessionKeyAccessListType, zeroHash } = await this.loadModules();

    const permissions = new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: BigInt(dto.spendLimit) })
      .setContractAccessControlType(SessionKeyAccessListType.ALLOW_SPECIFIED_ACCESS)
      .setContractAccessList(dto.contractAllowList)
      .setTimeRange({
        validFrom: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(Date.now() / 1000 + dto.validSeconds),
      });

    const { hash } = await client.installSessionKeyPlugin({
      args: [[await sessionKey.getAddress()], [zeroHash], [permissions.encode()]],
    });

    await client.waitForUserOperationTransaction({ hash });
  }

  async rotateSessionKey(sessionId: string) {
    const [session, client, modules] = await Promise.all([
      this.sessionRepository.findOneBy({ id: sessionId }),
      this.alchemyAAService.getAuthenticatedClient(),
      this.loadModules()
    ]);

    if (!session) throw new NotFoundException('Session not found');

    const newKey = new modules.SessionKeySigner();
    const newAddress = await newKey.getAddress();

    session.sessionKey = newAddress;
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    await client.rotateSessionKey({ oldKey: session.sessionKey, newKey: newAddress });

    return { newSessionKey: newAddress, validUntil: session.permissions.validUntil };
  }

  async updateSessionPermissions(sessionId: string, updateDto: UpdateSessionPermissionsDto) {
    const [session, client, modules] = await Promise.all([
      this.sessionRepository.findOneBy({ id: sessionId }),
      this.alchemyAAService.getAuthenticatedClient(),
      this.loadModules()
    ]);

    if (!session) throw new NotFoundException('Session not found');

    const permissions = new modules.SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: BigInt(updateDto.spendLimit) });

    await client.updateSessionKeyPermissions({ key: session.sessionKey, permissions: permissions.encode() });

    session.permissions.spendLimit = updateDto.spendLimit.toString();
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    return { message: 'Permissions updated successfully' };
  }

  async revokeSession(sessionId: string) {
    const [session, client] = await Promise.all([
      this.sessionRepository.findOneBy({ id: sessionId }),
      this.alchemyAAService.getAuthenticatedClient()
    ]);

    if (!session) throw new NotFoundException('Session not found');

    await client.removeSessionKey({ key: session.sessionKey });

    session.isActive = false;
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    return { message: 'Session revoked successfully' };
  }
}