import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { PaymentReferencesModule } from './modules/payment/payment-references/payment-references.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PaymentModule } from './modules/payment/payment.module';
import { BullModule } from '@nestjs/bullmq';
import { DebtNegotiationModule } from './modules/debt_negotiation/debt_negotiation.module';
import { BullMQWorkerService } from './bullmq-worker.service';

import { ScheduleModule } from '@nestjs/schedule';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { TypeServiceModule } from './modules/type_service/type_service.module';
import { AlunoModule } from './modules/aluno/aluno.module';
import { HttpModule } from '@nestjs/axios';
import { SharedModule } from './modules/shared/shared.module';

import { DiscountModule } from './modules/discount/discount.module';
import { IsencaoModule } from './modules/isencao/isencao.module';

import { PaymentTfcModule } from './modules/payment-tfc/payment-tfc.module';
import { FormaPagamentoModule } from './modules/forma-pagamento/forma-pagamento.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { UtilizadorModule } from './modules/utilizadores/utilizador.module';
import { CreditoEducacionalModule } from './modules/credito_educacional/credito_educacional.module';
import { TipoCreditoModule } from './modules/credito_educacional/tipo_credito/tipo_credito.module';
import { BolsaModule } from './modules/credito_educacional/bolsa/bolsa.module';
import { InstitutionalContractModule } from './modules/institutional-contract/institutional-contract.module';
import { ConciliacaoDividasModule } from './modules/conciliacao-dividas/conciliacao-dividas.module';
import { SiglaTipoServicosModule } from './modules/siglas-service/siglas-service.module';
import { BullConfigModule } from './common/bull/bull.module';
import { databaseOptionsFactory } from './common/config/database.factory';

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
      useFactory: (config: ConfigService) =>
        databaseOptionsFactory(config, __dirname + '/**/*.entity{.ts,.js}'),
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
    UtilizadorModule,
    CreditoEducacionalModule,
    BolsaModule,
    InstitutionalContractModule,
    ConciliacaoDividasModule,
    SiglaTipoServicosModule,
    BullConfigModule,
  ],
  providers: [BullMQWorkerService],
})
export class AppModule {}
