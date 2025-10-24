import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoiceModule } from './module/invoice/invoice.module'; 

@Module({
  imports: [
    // 1. Configuração do TypeORM para MySQL
    TypeOrmModule.forRoot({
      type: 'mysql', 
      host: '192.168.30.45', 
      port: 3306,
      username: 'root', 
      password: 'root123', 
      database: 'uma_db_dev',
      
      entities: [
        __dirname + '/**/*.entity{.ts,.js}', 
      ],
      
      // IMPORTANTE: Sincroniza o esquema do banco de dados com as suas entidades.
      // Defina para 'false' quando for para produção.
      synchronize: true, 
      extra: {
        ssl: false, 
        timezone: 'UTC', 
      }
    }),
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
