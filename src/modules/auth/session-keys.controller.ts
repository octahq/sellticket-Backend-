import { Controller, Post, Put, Body, Param } from '@nestjs/common';
import { AccountClientFactory } from './account-client.factory';
import { 
  SessionKeyPermissionsBuilder,
  SessionKeySigner 
} from '@account-kit/smart-contracts';

@Controller('session-keys')
export class SessionKeysController {
  constructor(private readonly accountFactory: AccountClientFactory) {}

  @Post('add/:email')
  async addSessionKey(@Param('email') email: string) {
    const client = await this.accountFactory.createClient(email);
    const sessionKeySigner = new SessionKeySigner();
    
    const permissions = new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: 1000000n })
      .encode();

    const result = await client.addSessionKey({
      key: await sessionKeySigner.getAddress(),
      tag: 'email-session-key',
      permissions
    });

    return { txHash: result.hash };
  }

  @Put('rotate/:email')
  async rotateKey(@Param('email') email: string, @Body('oldKey') oldKey: string) {
    const client = await this.accountFactory.createClient(email);
    const newKeySigner = new SessionKeySigner();

    const result = await client.rotateSessionKey({
      oldKey,
      newKey: await newKeySigner.getAddress()
    });

    return { newSessionKey: await newKeySigner.getAddress() };
  }

  @Put('permissions/:email')
  async updatePermissions(
    @Param('email') email: string,
    @Body() permissions: any
  ) {
    const client = await this.accountFactory.createClient(email);
    const builder = new SessionKeyPermissionsBuilder();

    if (permissions.spendLimit) {
      builder.setNativeTokenSpendLimit({ spendLimit: permissions.spendLimit });
    }

    const result = await client.updateKeyPermissions({
      key: permissions.sessionKeyAddress,
      permissions: builder.encode()
    });

    return { txHash: result.hash };
  }

  @Post('execute/:email')
  async executeTransaction(
    @Param('email') email: string,
    @Body() transaction: any
  ) {
    const client = await this.accountFactory.createClient(email);
    
    const result = await client.executeWithSessionKey({
      args: [
        [{
          target: transaction.to,
          value: transaction.value,
          data: transaction.data
        }],
        transaction.sessionKeyAddress
      ]
    });

    return { txHash: result.hash };
  }
} 