import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { CompanyKey } from 'src/common/config/security/key-company';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])], 
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceNumberingAndHashService,
    CompanyKey 
  ],
  exports: [InvoiceService, CompanyKey, InvoiceNumberingAndHashService],
})
export class InvoiceModule {}