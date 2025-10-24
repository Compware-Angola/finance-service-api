import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { CompanyKey } from 'src/common/config/security/key-company';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { AcademicYear } from './entities/academic.year.entity';

@Module({
  imports: [
   TypeOrmModule.forFeature([Invoice, TypeInvoiceDocument, AcademicYear]),
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceNumberingAndHashService,
    CompanyKey 
  ],
  exports: [InvoiceService, CompanyKey, InvoiceNumberingAndHashService],
})
export class InvoiceModule {}