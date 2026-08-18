import { Module } from '@nestjs/common';
import { ConciliacaoDividasService } from './conciliacao-dividas.service';
import { ConciliacaoDividasController } from './conciliacao-dividas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/InvoiceIten.entity';
import { ReconciliacaoNegociacaoDivida } from './entities/conciliacao-divida.entity';
import { InvoiceService } from '../invoice/invoice.service';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from 'src/common/constants/queue.constant';
import { StudentMovimentUtilService } from '../shared/student_moviments/student_moviments_util.service';
import { TypeInvoiceDocument } from '../invoice/entities/type.invoice.document.entity';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { InvoiceNumberingAndHashService } from '../invoice/invoice-numbering-hash.service';
import { AlunoService } from '../aluno/aluno.service';
import { CompanyKey } from 'src/common/config/security/key-company';

@Module({

  imports: [
    BullModule.registerQueue({
      name: QueueName.INVOICE_SERVICE,
    }),
    TypeOrmModule.forFeature([Invoice, InvoiceItem, ReconciliacaoNegociacaoDivida, TypeInvoiceDocument, AcademicYear])],
  controllers: [ConciliacaoDividasController],
  providers: [ConciliacaoDividasService, InvoiceService, StudentMovimentUtilService, InvoiceNumberingAndHashService, AlunoService, CompanyKey],
})
export class ConciliacaoDividasModule { }
