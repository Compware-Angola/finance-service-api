import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModule } from './module/invoice/invoice.module';
import { PaymentReferencesModule } from './module/payment/payment-references/payment-references.module';
import { WebhookModule } from './module/webhook/webhook.module';
import { PaymentModule } from './module/payment/payment.module';
import { BullModule } from '@nestjs/bullmq';
import { DebtNegotiationModule } from './module/debt_negotiation/debt_negotiation.module';
import { AdvancePaymentsModule } from './module/advance_payments/advance_payments.module';
import { BullMQWorkerService } from './bullmq-worker.service';


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
  BullModule.forRootAsync({
      imports: [ConfigModule], 
      inject: [ConfigService], 
      useFactory: (config: ConfigService) => ({ 
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'), 
          port: config.get<number>('REDIS_PORT', 6379),      
        },
      }),
    }),
    InvoiceModule,
    PaymentReferencesModule,
    WebhookModule,
    PaymentModule,
    DebtNegotiationModule,
    AdvancePaymentsModule,

  ],
  providers: [
    BullMQWorkerService, // ADICIONE AQUI
  ],


})
export class AppModule { }
