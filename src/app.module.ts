import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModule } from './module/invoice/invoice.module';
import { PaymentReferencesModule } from './module/payment/payment-references/payment-references.module';
import { WebhookModule } from './module/webhook/webhook.module';
import { PaymentModule } from './module/payment/payment.module';
import { BullModule } from '@nestjs/bullmq';
import { DebtNegotiationModule } from './module/debt_negotiation/debt_negotiation.module';
import { BullMQWorkerService } from './bullmq-worker.service';

import { ScheduleModule } from '@nestjs/schedule';
import { DisciplineModule } from './module/discipline/discipline.module';
import { TypeServiceModule } from './module/type_service/type_service.module';
import { AlunoModule } from './module/aluno/aluno.module';
import { HttpModule } from '@nestjs/axios';
import { SharedModule } from './module/shared/shared.module';

import { DiscountModule } from './module/discount/discount.module';
import { IsencaoModule } from './module/isencao/isencao.module';

import { TipoCreditoModule } from './module/tipo_credito/tipo_credito.module';
import { PaymentTfcModule } from './module/payment-tfc/payment-tfc.module';
import { FormaPagamentoModule } from './module/forma-pagamento/forma-pagamento.module';
import { CashRegistersModule } from './module/cash-registers/cash-registers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env.prod';
          case 'preprod':
            return '.env.preprod';
          default:
            return '.env.dev';
        }
      })(),
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSSL = config.get<string>('DB_SSL') === 'true';

        return {
          type: 'oracle' as const,
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 1521),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          sid: config.get<string>('DB_SID'),

          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: ['query', 'error'],

          extra: {
            disableInsertDefaultValues: true,
            ...(isSSL ? { ssl: { rejectUnauthorized: true } } : {}),
          },
        };
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        prefix: config.get<string>('BULL_PREFIX') || 'dev',
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
          // password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    InvoiceModule,
    PaymentReferencesModule,
    WebhookModule,
    PaymentModule,
    DebtNegotiationModule,
    AlunoModule,

    ScheduleModule.forRoot(),

    DisciplineModule,

    TypeServiceModule,
    TipoCreditoModule,

    SharedModule,
    DiscountModule,
    IsencaoModule,
    PaymentTfcModule,
    FormaPagamentoModule,
    CashRegistersModule,
  ],
  providers: [BullMQWorkerService],
})
export class AppModule {}
