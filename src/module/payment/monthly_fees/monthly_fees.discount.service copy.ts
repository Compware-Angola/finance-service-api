import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';
import { TestMonthlyDTO } from './dto/test-monthly.dto';
import { obterMulta } from 'src/module/util/obter-multa';
import {
  BolsaParams,
  CalcularDescontoParams,
  CalcularValorMensalidadeParams,
  MesTempResponse,
  ObterBolseiroParams,
} from './types';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { formatDisplay } from 'src/module/util/format-date';

export class MonthlyFeesDiscountService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,
  ) {}
  //Informações para gerar as mensalidades
  private semDesconto() {
    return {
      temDesconto: false,
      percentualDesconto: 0,
      fatorDesconto: 0,
    };
  }
  private async buscarDescontoEspecialPorSigla(sigla: string, data: Date) {
    const sql = `
    SELECT
      TAXA,
      DESCRICAO,
      DATA_INICIO,
      DATA_FIM
    FROM FK2_DESCONTOS_ESPECIAIS
    WHERE SIGLA = :sigla
      AND TO_DATE(:data, 'YYYY-MM-DD')
        BETWEEN DATA_INICIO AND DATA_FIM
    FETCH FIRST 1 ROW ONLY
  `;
    type DescontoRow = {
      TAXA: number;
      DESCRICAO: string;
      DATA_INICIO: Date;
      DATA_FIM: Date;
    };
    const resultado = await this.dataSource.query<DescontoRow>(sql, {
      sigla,
      data: formatDisplay(data),
    } as any);
    const desconto = resultado?.[0];
    if (!desconto) {
      return this.semDesconto();
    }
    const percentualDesconto = Number(desconto.TAXA ?? 0);
    return {
      temDesconto: true,
      percentualDesconto,
      fatorDesconto: percentualDesconto / 100,
      descricao: desconto.DESCRICAO,
      dataInicio: desconto.DATA_INICIO,
      dataFim: desconto.DATA_FIM,
    };
  }
  private async obterDescontoEspecial(
    codigoMatricula: number,
    dataInicial: Date,
  ) {}
}
