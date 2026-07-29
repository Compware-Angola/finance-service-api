// debt-negotiation.module.ts
import { Module } from '@nestjs/common';
import { DebtNegotiationService } from './debt_negotiation.service';
import { DebtNegotiationController } from './debt_negotiation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entidades
import { Payment } from '../payment/entities/payment.entity';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';
import { TbPagamentosi } from './entities/tb-pagamentosi.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/InvoiceIten.entity';
import { TbTipoServico } from './entities/tb-tipo-servico.entity';
import { TbMatricula } from './entities/tb-matricula.entity';
import { TbAdmissao } from './entities/tb-admissao.entity';
import { TbCurso } from './entities/tb-curso.entity';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { InscricaoAvaliacao } from './entities/inscricao-avaliacao.entity';
import { MesCalendario } from './entities/mes-calendario.entity';
import { MesTemp } from './entities/mes-temp.entity';
import { MotivoIsencaoIva } from './entities/motivo-isencao-iva.entity';
import { Parametro } from './entities/parametro.entity';
import { TbBolseiroSiiuma } from './entities/tb-bolseiro-siiuma.entity';
import { TbConfirmacao } from './entities/tb-confirmacao.entity';
import { TbDisciplina } from './entities/tb-disciplina.entity';
import { TbGradeCurricular } from './entities/tb-grade-curricular.entity';
import { TbInscricaoAnoAnterior } from './entities/tb-inscricao-ano-anterior.entity';
import { TipoTaxa } from './entities/tipo-taxa.entity';
import { Empresa } from './entities/empresa.entity';
import { TypeInvoiceDocument } from '../invoice/entities/type.invoice.document.entity';
import { DebtNegotiation } from './entities/debt_negotiation.entity';

// Services
import { AnoLectivoUtil } from '../util/current-academic-year';
import { MesesPagarService } from './meses-pagar.service';
import { PropinaAlunoService } from './propina-aluno.service';
import { InvoiceService } from '../invoice/invoice.service';

import { CreateDebtNegotiationService } from './negotation.create.service';
import { InvoiceNumberingAndHashService } from '../invoice/invoice-numbering-hash.service';
import { CompanyKey } from 'src/common/config/security/key-company';
import { ListDebtNegotiationController } from './list_debt_negotiation.controller';
import { ListDebtNegotiationService } from './list_debt_negotiation.service';
import { MonthlyFeesDiscountUtilService } from '../shared/monthly_fees/monthly_fees.discount.Util.service';
import { NegotiationService } from './negotiation.service';
import { StudentMovimentUtilService } from '../shared/student_moviments/student_moviments_util.service';
import { AlunoService } from '../aluno/aluno.service';
import { TipoCandidatura } from '../invoice/entities/tipo.candidatura.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'invoice_service',
    }),
    TypeOrmModule.forFeature([
      Payment,
      TbPreinscricao,
      TbPagamentosi,
      Invoice,
      InvoiceItem,
      TbTipoServico,
      TbMatricula,
      TbAdmissao,
      TbCurso,
      AcademicYear,
      InscricaoAvaliacao,
      MesCalendario,
      MesTemp,
      MotivoIsencaoIva,
      Parametro,
      TbBolseiroSiiuma,
      TbConfirmacao,
      TbDisciplina,
      TbGradeCurricular,
      TbInscricaoAnoAnterior,
      TipoTaxa,
      Empresa,
      TypeInvoiceDocument,
      DebtNegotiation,
      TipoCandidatura,
    ]),
  ],
  controllers: [DebtNegotiationController, ListDebtNegotiationController],
  providers: [
    DebtNegotiationService,
    NegotiationService,
    CreateDebtNegotiationService,
    ListDebtNegotiationService,
    AnoLectivoUtil,
    MesesPagarService,
    PropinaAlunoService,
    InvoiceService,
    InvoiceNumberingAndHashService,
    CompanyKey,
    MonthlyFeesDiscountUtilService,
    StudentMovimentUtilService,
    AlunoService,
  ],
})
export class DebtNegotiationModule {}
