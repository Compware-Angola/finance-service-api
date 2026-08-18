import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { CompanyKey } from 'src/common/config/security/key-company';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { AcademicYear } from './entities/academic.year.entity';
import { InvoiceItem } from './entities/InvoiceIten.entity';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from 'src/common/constants/queue.constant';
import { InvoiceProcessor } from '../jobs/invoice-servico.processor';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { StudentMovimentUtilService } from '../shared/student_moviments/student_moviments_util.service';
import { AlunoService } from '../aluno/aluno.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      Invoice,
      TypeInvoiceDocument,
      AcademicYear,
      InvoiceItem,
    ]),
    BullModule.registerQueue({
      name: QueueName.INVOICE_SERVICE,
    }),
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceNumberingAndHashService,
    CompanyKey,
    InvoiceProcessor,
    StudentMovimentUtilService,
    AlunoService,
  ],
  exports: [
    InvoiceService,
    CompanyKey,
    InvoiceNumberingAndHashService,
    InvoiceProcessor,
    StudentMovimentUtilService,
    AlunoService,
  ],
})
export class InvoiceModule {}
