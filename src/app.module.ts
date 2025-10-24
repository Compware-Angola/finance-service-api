import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoiceModule } from './module/invoice/invoice.module';

@Module({
  imports: [
    // 1. Configuração do ConfigModule (DEVE SER O PRIMEIRO)
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Configuração do TypeORM usando useFactory para ler variáveis de ambiente
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], 
      inject: [ConfigService], 
      useFactory: (config: ConfigService) => ({ 
        type: 'mysql',
        
 
        host: config.get<string>('DB_HOST', '192.168.30.45'), 
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'), 
        password: config.get<string>('DB_PASSWORD', 'root123'), 
        database: config.get<string>('DB_DATABASE', 'uma_db_dev'),
        
        entities: [
          __dirname + '/**/*.entity{.ts,.js}', 
        ],
        
        synchronize: true, 
        extra: {
          ssl: false, 
          timezone: 'UTC', 
        }
      }),
    }),
    
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
