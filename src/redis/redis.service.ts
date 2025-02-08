import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private circuitBreaker: CircuitBreaker;
  private redisClient: Redis;

  constructor(@Inject('REDIS_CLIENT') redisClient: Redis) {
    this.redisClient = redisClient;
    this.circuitBreaker = new CircuitBreaker({
      requestVolumeThreshold: 5,
      errorThresholdPercentage: 50,
      sleepWindowMS: 5000,
      timeout: 3000,
    });
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis');
        this.circuitBreaker.reset();
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis connection error:', err);
        this.circuitBreaker.recordFailure();
      });

      this.redisClient.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.circuitBreaker.recordFailure();
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.log('Reconnecting to Redis...');
      });
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.circuitBreaker.recordFailure();
    }
  }

  async getClient(): Promise<Redis> {
    if (this.circuitBreaker.isOpen()) {
      this.logger.warn('Redis circuit breaker is open, requests are blocked.');
      throw new Error('Redis circuit breaker is open');
    }

    return this.redisClient;
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.circuitBreaker.fire(() =>
      this.redisClient.publish(channel, message),
    );
  }

  async subscribe(
    channel: string,
    handler: (message: string) => void,
  ): Promise<void> {
    try {
      await this.redisClient.subscribe(channel, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to channel ${channel}:`, err);
        } else {
          this.logger.log(`Subscribed to channel ${channel}`);
        }
      });

      this.redisClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          handler(message);
        }
      });
    } catch (error) {
      this.logger.error(`Error subscribing to channel ${channel}:`, error);
    }
  }

  async xadd(streamKey: string, message: any): Promise<string> {
    const args = [streamKey, '*', ...Object.entries(message).flat()] as [
      string,
      string,
      ...string[],
    ];
    return this.circuitBreaker.fire(() => this.redisClient.xadd(...args));
  }

  async xreadGroup(
    groupName: string,
    consumerName: string,
    streamKey: string,
    count: number,
    block: number,
    handler: (messages: any[]) => void,
  ): Promise<void> {
    try {
      const streams: string[] = [`${streamKey}`, '>'];

      while (true) {
        if (this.circuitBreaker.isOpen()) {
          this.logger.warn('Circuit breaker is open. Cannot read from stream.');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        try {
          const response = await this.circuitBreaker.fire(() =>
            this.redisClient.xreadgroup(
              'GROUP',
              groupName,
              consumerName,
              'COUNT',
              count,
              'BLOCK',
              block,
              'STREAMS',
              ...(streams as [string, string]),
            ),
          );

          if (response) {
            const messages = response[0][1];
            handler(messages);
          }
        } catch (error) {
          this.logger.error('Error reading from stream:', error);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } catch (error) {
      this.logger.error('Error in xreadGroup loop:', error);
    }
  }

  async xack(
    streamKey: string,
    groupName: string,
    messageId: string,
  ): Promise<number> {
    return this.circuitBreaker.fire(() =>
      this.redisClient.xack(streamKey, groupName, messageId),
    );
  }

  async xgroupCreate(streamKey: string, groupName: string): Promise<string> {
    try {
      const result = await this.redisClient.xgroup(
        'CREATE',
        streamKey,
        groupName,
        '$',
        'MKSTREAM',
      );
      return result as string;
    } catch (error: any) {
      if (error.message.startsWith('BUSYGROUP')) {
        this.logger.warn(
          `Group ${groupName} already exists on stream ${streamKey}`,
        );
        return 'OK';
      }
      this.logger.error(
        `Error creating group ${groupName} on stream ${streamKey}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Acquire a distributed lock using Redis
   * @param key - The lock key to acquire
   * @returns boolean indicating if lock was acquired
   */
  async acquireLock(key: string): Promise<boolean> {
    const result = await this.circuitBreaker.fire(() =>
      this.redisClient.set(key, 'locked', 'EX', 30, 'NX'),
    );
    return result === 'OK';
  }

  /**
   * Release a distributed lock in Redis
   * @param key - The lock key to release
   */
  async releaseLock(key: string): Promise<void> {
    await this.circuitBreaker.fire(() => this.redisClient.del(key));
  }
}
