import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModule } from './module/invoice/invoice.module';
import { PaymentsModule } from './module/payments/payments.module';
import { DebtNegotiationModule } from './module/debt_negotiation/debt_negotiation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSSL = config.get<string>('DB_SSL') === 'true';

        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 3306),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),

          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,

          extra: isSSL
            ? {
                ssl: {
                  rejectUnauthorized: true,
                },
              }
            : {},
        };
      },
    }),
    InvoiceModule,
    PaymentsModule,
    DebtNegotiationModule,
  ],


})
export class AppModule {}
