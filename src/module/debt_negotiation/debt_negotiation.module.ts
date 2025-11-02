import { Module } from '@nestjs/common';
import { DebtNegotiationService } from './debt_negotiation.service';
import { DebtNegotiationController } from './debt_negotiation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { AnoLectivoUtil } from '../util/current-academic-year';
import { MesesPagarService } from './meses-pagar.service';
import { PropinaAlunoService } from './propina-aluno.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, TbPreinscricao,

    TbPagamentosi, Invoice, InvoiceItem, TbTipoServico, TbMatricula,
    TbAdmissao, TbCurso, AcademicYear, TbInscricaoAnoAnterior, TbConfirmacao,
    MesTemp, TbBolseiroSiiuma, InscricaoAvaliacao, TbGradeCurricular,
    TipoTaxa, MotivoIsencaoIva,
    TbDisciplina,
    MesCalendario,
    Parametro,
    Empresa
  ]),],
  controllers: [DebtNegotiationController],
  providers: [DebtNegotiationService,AnoLectivoUtil,MesesPagarService,PropinaAlunoService],
})
export class DebtNegotiationModule { }


