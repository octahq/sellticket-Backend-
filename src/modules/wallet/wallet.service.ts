import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Coinbase, Wallet as CoinbaseWallet } from '@coinbase/coinbase-sdk';
import config from '../../config/env.config';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {
    // Initialize Coinbase SDK
    Coinbase.configure({
      apiKeyName: config.coinbase.apiKeyName,
      privateKey: config.coinbase.privateKey,
    });
  }

  async createWallet(userId: string): Promise<Wallet> {
    try {
      // Create a new wallet using Coinbase SDK
      const coinbaseWallet = await CoinbaseWallet.create();
      const address = await coinbaseWallet.getDefaultAddress();

      // Create wallet entity
      const walletEntity = this.walletRepository.create({
        address: address.toString(),
        privateKey: coinbaseWallet.export().toString(),
        user: { id: userId },
        balance: 0,
        currency: 'ETH',
      } as unknown as Wallet);

      return await this.walletRepository.save(walletEntity);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw new HttpException(
        'Failed to create wallet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWalletBalance(address: string): Promise<number> {
    try {
      const wallet = await CoinbaseWallet.fetch(address);
      const balance = await wallet.getBalance(Coinbase.assets.Eth);
      return parseFloat(balance.toString());
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw new HttpException(
        'Failed to get wallet balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async transferFunds(
    fromAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const wallet = await this.walletRepository.findOne({
        where: { address: fromAddress },
      });

      if (!wallet) {
        throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
      }

      // Re-instantiate the wallet using stored data
      const coinbaseWallet = await CoinbaseWallet.import(
        JSON.parse(wallet.privateKey),
      );

      // Create and execute the transfer
      const transfer = await coinbaseWallet.createTransfer({
        amount,
        assetId: Coinbase.assets.Eth,
        destination: toAddress,
      });

      // Wait for the transfer to complete
      await transfer.wait();

      return true;
    } catch (error) {
      console.error('Failed to transfer funds:', error);
      throw new HttpException(
        'Failed to transfer funds',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return await this.walletRepository.find({
      where: { user: { id: userId } },
    });
  }
}
