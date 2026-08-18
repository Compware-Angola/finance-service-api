import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseOptionsFactory = (
  config: ConfigService,
  entitiesPath: string,
): TypeOrmModuleOptions => {
  const isSSL = config.get<string>('DB_SSL') === 'true';

  process.env.TZ = config.get<string>('TZ') || 'Africa/Luanda';
  process.env.ORA_SDTZ = config.get<string>('ORA_SDTZ') || 'Africa/Luanda';

  return {
    type: 'oracle' as const,
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT', 1521),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    sid: config.get<string>('DB_SID'),
    timezone: config.get<string>('TZ') || 'Africa/Luanda',
    entities: [entitiesPath],
    synchronize: false,
    logging: ['query', 'error'],
    extra: {
      disableInsertDefaultValues: true,
      ...(isSSL ? { ssl: { rejectUnauthorized: true } } : {}),
    },
  } as TypeOrmModuleOptions;
};
