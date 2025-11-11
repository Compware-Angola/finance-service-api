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
import { DefaultNamingStrategy } from 'typeorm';


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
      type: 'oracle' as const,
      host: config.get<string>('DB_HOST'),
      port: config.get<number>('DB_PORT', 1521),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      sid: config.get<string>('DB_SID'),

      // === CORREÇÃO FINAL ===
     // schema: 'DBUMA',  // <--- SCHEMA CORRETO (o prefixo das tabelas)

      // Força TODOS os nomes de tabela/coluna para UPPERCASE (ex: UMA_FACTURA)
 namingStrategy: new (class extends DefaultNamingStrategy {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    const name = userSpecifiedName || targetName;
    return 'UMA_' + name.toUpperCase(); 
  }

})(),

      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: ['query', 'error'], 

      extra: isSSL
        ? { ssl: { rejectUnauthorized: true } }
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
  

  ],
  providers: [
    BullMQWorkerService, 
  ],


})
export class AppModule { }
