import { ConfigService } from '@nestjs/config';

export interface BullConnectionOptions {
  prefix: string;
  connection: {
    host: string;
    port: number;
    password?: string;
  };
}

export const bullConnectionFactory = (
  config: ConfigService,
): BullConnectionOptions => {
  const password = config.get<string>('REDIS_PASSWORD');

  return {
    prefix: config.get<string>('BULL_PREFIX') || 'dev',
    connection: {
      host: config.get<string>('REDIS_HOST') || 'localhost',
      port: config.get<number>('REDIS_PORT') || 6379,
      ...(password ? { password } : {}),
    },
  };
};
