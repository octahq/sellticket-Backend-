import { Logger } from '@nestjs/common';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  requestVolumeThreshold: number;
  sleepWindowMS: number;
}

enum CircuitBreakerState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private requestCount: number = 0;
  private lastErrorTimestamp: number = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      timeout: options.timeout || 3000,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      requestVolumeThreshold: options.requestVolumeThreshold || 5,
      sleepWindowMS: options.sleepWindowMS || 5000,
    };
  }

  async fire<T>(fn: () => Promise<T>): Promise<T> {
    this.requestCount++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastErrorTimestamp < this.options.sleepWindowMS) {
        this.logger.warn('Circuit breaker is open.');
        throw new Error('Circuit breaker is open');
      } else {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.log(
          'Circuit breaker is half-open. Attempting a trial request.',
        );
      }
    }

    try {
      const result = await Promise.race<T>([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timed out')),
            this.options.timeout,
          ),
        ),
      ]);
      this.reset();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastErrorTimestamp = Date.now();
    this.checkState();
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.requestCount = 0;
    this.logger.log('Circuit breaker reset.');
  }

  private checkState(): void {
    const errorRate = (this.failureCount / this.requestCount) * 100;

    if (
      this.requestCount >= this.options.requestVolumeThreshold &&
      errorRate > this.options.errorThresholdPercentage
    ) {
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.lastErrorTimestamp = Date.now();
    this.logger.warn('Circuit breaker opened.');
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }
}
