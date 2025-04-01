import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { TransferFundsDto } from './dto/transfer-funds.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new wallet for the authenticated user' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      properties: {
        address: { type: 'string' },
        balance: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createWallet(@User() user: { userId: string; email: string }) {
    return await this.walletService.createWallet(user.userId);
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get wallet balance by address' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    schema: {
      properties: {
        balance: { type: 'number' },
        currency: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getBalance(@Param('address') address: string) {
    return await this.walletService.getWalletBalance(address);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiResponse({
    status: 200,
    description: 'Funds transferred successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        transactionHash: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient funds' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async transferFunds(@Body() transferFundsDto: TransferFundsDto) {
    return await this.walletService.transferFunds(
      transferFundsDto.fromAddress,
      transferFundsDto.toAddress,
      transferFundsDto.amount,
    );
  }

  @Get('my-wallets')
  @ApiOperation({ summary: 'Get all wallets for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User wallets retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          address: { type: 'string' },
          balance: { type: 'number' },
          currency: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMyWallets(@User() user: { userId: string; email: string }) {
    return await this.walletService.getUserWallets(user.userId);
  }
}
