import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceModule } from './module/invoice/invoice.module';
import { PaymentReferencesModule } from './module/payment-references/payment-references.module';

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
    PaymentReferencesModule,
 
  ],


})
export class AppModule {}
