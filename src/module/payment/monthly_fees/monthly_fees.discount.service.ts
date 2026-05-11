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
  EstudanteInfo,
} from './types';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { formatDisplay } from 'src/module/util/format-date';

export class MonthlyFeesDiscountService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,
  ) { }
  //Informações para gerar as mensalidades

  private async obterInfoAluno(
    codigoMatricula: number,
  ): Promise<EstudanteInfo> {
    const sqlObterInfoAluno = `
      select c.designacao     as curso,
       c.codigo               as codigo_curso,
       nvl(p.polo_id,1)       as polo
      from fk2_tb_matriculas m
      inner join fk2_tb_cursos        c on c.codigo = m.codigo_curso
      inner join fk2_tb_admissao      a on a.codigo = m.codigo_aluno
      inner join fk2_tb_preinscricao  p on p.codigo = a.pre_incricao
      where m.codigo = :codigoMatricula
    `;
    const resultObterInfoAluno = await this.dataSource.query(
      sqlObterInfoAluno,
      {
        codigoMatricula,
      } as any,
    );

    const row = resultObterInfoAluno?.[0];
    if (!row) {
      throw new BadRequestException('Nenhuma informação encontrada');
    }
    return toLowerCaseKeys(row);
  }

  private async obterBolseiro({
    anoLectivo,
    codigoMatricula,
    semestre,
  }: ObterBolseiroParams) {
    const sqlBolseiro = `
    select
      desconto
    from
    fk2_tb_bolseiros
    where 1=1
    and codigo_matricula  = :codigoMatricula
    and codigo_anolectivo = :anoLectivo
    and semestre = :semestre
    `;

    const resultado = await this.dataSource.query(sqlBolseiro, {
      anoLectivo,
      codigoMatricula,
      semestre,
    } as any);

    const row = resultado?.[0];
    if (!row) {
      return {
        bolseiro: false,
        desconto: 0,
      };
    }
    const desconto = row.DESCONTO;
    const novoDesconto = desconto == 0 ? 1 : desconto / 100;
    return {
      bolseiro: true,
      desconto: novoDesconto,
    };
  }

  private async obterDescontoNormal({
    anoLectivo,
    codigoMatricula,
    mesTemp,
  }: BolsaParams) {
    const sqlBolseiro = `
      select de.TAXA as VALOR_DESCONTO
      from FK2_TB_DESCONTOS_ALUNOO da
      inner join FK2_DESCONTOS_ESPECIAIS de on  da.CODIGO_TIPO_DESCONTO = de.id
      where 1=1
      and da.codigo_matricula = :codigoMatricula
      and da.codigo_anolectivo = :anoLectivo
      and da.afectacao = 'Pagamento de Propina'
      and (da.semestre = :semestre or da.semestre = 3)
      and da.deleted_at is null
      FETCH FIRST 1 ROWS ONLY
    `;
    const resultado = await this.dataSource.query(sqlBolseiro, {
      semestre: mesTemp.semestre,
      anoLectivo,
      codigoMatricula,
    } as any);
    const row = resultado?.[0];
    if (row) {
      const taxa = Number(row.VALOR_DESCONTO ?? 0);
      return {
        temDesconto: true,
        desconto: taxa / 100,
      };
    }
    return {
      temDesconto: false,
      desconto: 0,
    };
  }

  private async obterMensalidade(
    codigoMatricula: number,
    anoLectivo: number,
  ): Promise<number> {
    //Aqui eu obtenho as informações
    const sqlObterInfoAluno = `
      select c.designacao     as curso,
       nvl(p.polo_id,1)       as polo
      from fk2_tb_matriculas m
      inner join fk2_tb_cursos        c on c.codigo = m.codigo_curso
      inner join fk2_tb_admissao      a on a.codigo = m.codigo_aluno
      inner join fk2_tb_preinscricao  p on p.codigo = a.pre_incricao
      where m.codigo = :codigoMatricula
    `;
    const resultObterInfoAluno = await this.dataSource.query(
      sqlObterInfoAluno,
      {
        codigoMatricula,
      } as any,
    );

    const row = resultObterInfoAluno?.[0];
    if (!row) {
      throw new BadRequestException('Nenhuma informação encontrada');
    }

    const curso = row?.CURSO;
    const polo = row?.POLO;
    console.log(curso);
    const sqlMensalidade = `
        select PRECO
        from FK2_TB_TIPO_SERVICOS
        where 1=1
        and  DESCRICAO   LIKE 'Propina ' || :curso || '%'
        and CODIGO_ANO_LECTIVO = :anoLectivo
        and POLO_ID = :polo
        and ESTADO = 'Ativo'
        order by DATA desc
        FETCH FIRST 1 ROW ONLY
    `;
    const sqlResultadoMensalidade = await this.dataSource.query(
      sqlMensalidade,
      {
        curso,
        polo,
        anoLectivo,
      } as any,
    );
    const rowMensalidade = sqlResultadoMensalidade?.[0];
    if (!rowMensalidade) {
      throw new BadRequestException('Nenhuma mensalidade encontrada');
    }

    return rowMensalidade.PRECO;
  }
  private async obterDescontoFinalista(
    codigoMatricula: number,
    anoLectivo: number,
  ): Promise<any> {
    const estudante = await this.obterInfoAluno(codigoMatricula);

    const cursoId = estudante.codigo_curso;

    const duracaoCursoSql = `
    SELECT
      DURACAO
    FROM FK2_TB_CURSOS
    WHERE CODIGO = :cursoId
  `;

    const resultDuracao = await this.dataSource.query(duracaoCursoSql, {
      cursoId,
    } as any);

    const duracaoCurso = Number(resultDuracao?.[0]?.DURACAO || 0);
    const sqlAnoInscrito = `
    SELECT
      cl.CODIGO AS CODIGO,
      cl.DESIGNACAO,
      COUNT(ftgca.CODIGO) AS QUANTIDADE_GRADES
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
    LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
      ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
    LEFT JOIN FK2_TB_CLASSES cl
      ON cl.CODIGO = ftgc.CODIGO_CLASSE
    WHERE ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
      AND ftgca.CODIGO_MATRICULA = :codigoMatricula
      AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
    GROUP BY cl.CODIGO, cl.DESIGNACAO
    ORDER BY COUNT(ftgca.CODIGO) DESC
  `;

    const resultAnoInscrito = await this.dataSource.query(sqlAnoInscrito, {
      anoLectivo,
      codigoMatricula,
    } as any);

    const anoInscrito = Number(resultAnoInscrito?.[0]?.CODIGO || 0);
    console.log('@@@@||', anoInscrito);
    if (anoInscrito !== duracaoCurso) {
      return false;
    }

    const sqlCadeirasInscritasAnoCorrente = `
    SELECT
      COUNT(*) AS TOTAL
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO
    WHERE CODIGO_MATRICULA = :codigoMatricula
      AND CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
      AND CODIGO_ANO_LECTIVO = :anoLectivo
  `;

    const resultCadeirasInscritasAnoCorrente = await this.dataSource.query(
      sqlCadeirasInscritasAnoCorrente,
      {
        anoLectivo,
        codigoMatricula,
      } as any,
    );

    const totalCadeiras = Number(
      resultCadeirasInscritasAnoCorrente?.[0]?.TOTAL || 0,
    );
    console.log('@@@@||', totalCadeiras);
    if (totalCadeiras > 0 && totalCadeiras < 5) {
      return {
        temDesconto: true,
        desconto: 0.5,
      };
    }
    return {
      temDesconto: false,
      desconto: 0,
    };
  }
  private async obterDescontoEspecial(
    codigoMatricula: number,
    dataInicial: Date,
  ) {
    //obter informações gerais do aluno
    const sqlAluno = `
      select
          c.codigo                        as curso,
          c.sigla                         as sigla,
          p.CODIGO_TURNO	                as turno,
          nvl(p.polo_id,1)                as polo
      from fk2_tb_matriculas m
      inner join fk2_tb_cursos        c on c.codigo = m.codigo_curso
      inner join fk2_tb_admissao      a on a.codigo = m.codigo_aluno
      inner join fk2_tb_preinscricao  p on p.codigo = a.pre_incricao
      where m.codigo = :codigoMatricula
    `;
    const resultado = await this.dataSource.query(sqlAluno, {
      codigoMatricula,
    } as any);
    const rowAluno = resultado?.[0];
    if (!rowAluno) {
      throw new BadRequestException('Informações do aluno não encontrado');
    }

    if (rowAluno.SIGLA == 'EAP') {
      const sqlDescontoAgro = `SELECT
              TAXA,
              DESCRICAO,
              DATA_INICIO,
              DATA_FIM
              FROM FK2_DESCONTOS_ESPECIAIS
               where SIGLA = 'DAP50_AGRO_2324'
               and ESTADO = 1
               and  TO_DATE(:dataTemp, 'YYYY-MM-DD') BETWEEN DATA_INICIO AND DATA_FIM
              `;
      const resultadoAgro = await this.dataSource.query(sqlDescontoAgro, {
        dataTemp: formatDisplay(dataInicial),
      } as any);
      console.log('Agro', resultadoAgro);
      const rowAgro = resultadoAgro?.[0];
      if (rowAgro) {
        const taxa = Number(rowAgro.TAXA ?? 0);

        return {
          temDesconto: true,
          desconto: taxa / 100,
        };
      }
    } else if (rowAluno.TURNO == 6) {
      const sqlDescontoNoturno = `
      SELECT
        TAXA,
        DESCRICAO,
        DATA_INICIO,
        DATA_FIM
      FROM FK2_DESCONTOS_ESPECIAIS
      where SIGLA = 'DEN20_POSLAB'
       and ESTADO = 1
      and  TO_DATE(:dataTemp, 'YYYY-MM-DD') BETWEEN DATA_INICIO AND DATA_FIM
      `;
      const resultadoDescontoNoturno = await this.dataSource.query(
        sqlDescontoNoturno,
        {
          dataTemp: formatDisplay(dataInicial),
        } as any,
      );

      const rowDescontoNoturno = resultadoDescontoNoturno?.[0];
      if (rowDescontoNoturno) {
        const taxa = Number(rowDescontoNoturno.TAXA ?? 0);
        return {
          temDesconto: true,
          desconto: taxa / 100,
        };
      }
    }
    return {
      temDesconto: false,
      desconto: 0,
    };
  }
  private async calcularDesconto({
    anoLectivo,
    codigoMatricula,
    mesTemp,
  }: CalcularDescontoParams) {
    const bolseiro = await this.obterBolseiro({
      anoLectivo: anoLectivo,
      codigoMatricula: codigoMatricula,
      semestre: mesTemp.semestre,
    });
    if (bolseiro.bolseiro == true) return bolseiro.desconto;

    //Verificar desconto de especias
    const descontoEspecial = await this.obterDescontoEspecial(
      codigoMatricula,
      mesTemp.data_limite,
    );
    if (descontoEspecial.temDesconto == true) return descontoEspecial.desconto;

    //Desconto normal
    const descontoNormal = await this.obterDescontoNormal({
      anoLectivo,
      codigoMatricula,
      mesTemp,
    });
    if (descontoNormal.temDesconto == true) return descontoNormal.desconto;

    const descontoFinalista = await this.obterDescontoFinalista(
      codigoMatricula,
      anoLectivo,
    );
    if (descontoFinalista.temDesconto == true)
      return descontoFinalista.desconto;
    return 0;
  }

  private async existIsencaoMulta(codigoMatricula: number, mesTempId: number) {
    const resultado = await this.dataSource.query(
      `
        select COUNT(*) AS TOTAL
        from FK2_TB_ISENCOE_MULTA
        where MES_TEMP_ID = :mesTempId
        and CODIGO_MATRICULA = :codigoMatricula
        and UPPER(ESTADO_ISENSAO) = 'ACTIVO'
        `,
      {
        codigoMatricula,
        mesTempId: mesTempId,
      } as any,
    );
    const row = resultado?.[0];

    if (row && row.TOTAL > 0) {
      return true;
    }
    return false;
  }
  private async calcularPercentagemMulta(
    codigoMatricula: number,
    mesTemp: MesTempResponse,
    periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[] = []

  ) {
    const existMulta = await this.existIsencaoMulta(
      codigoMatricula,
      mesTemp.id
    );
    if (existMulta) return 0;
    const percentagemMulta = obterMulta(
      mesTemp.data_limite,
      periodosIsentos

    );

    return percentagemMulta;
  }
  private async existIsencaoMensalidade(
    codigoMatricula: number,
    mesTempId: number,
  ) {
    const resultado = await this.dataSource.query(
      `
        select COUNT(*) AS TOTAL
        from FK2_TB_ISENCOES
        where MES_TEMP_ID = :mesTempId
        and CODIGO_MATRICULA = :codigoMatricula
        and UPPER(ESTADO_ISENSAO) = 'ACTIVO'
        `,
      {
        codigoMatricula,
        mesTempId: mesTempId,
      } as any,
    );

    const row = resultado?.[0];

    if (row && row.TOTAL > 0) {
      return true;
    }
    return false;
  }
  private async obterStatusPagamento(
    isBolseiroIntegral: boolean,
    codigoMatricula: number,
    mesTempId: number,
  ) {
    if (isBolseiroIntegral) return 1;
    const existeIsencaoMensalidade = await this.existIsencaoMensalidade(
      codigoMatricula,
      mesTempId,
    );
    if (existeIsencaoMensalidade) return 4;
    return 0;
  }
  private async calcularValorMulta(
    codigoMatricula: number,
    mesTemp: MesTempResponse,
    percentagemDesconto: number,
    mensalidade: number,
    periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[] = []

  ) {
    const percentagemMulta = await this.calcularPercentagemMulta(
      codigoMatricula,
      mesTemp,
      periodosIsentos
    );

    const multa = mensalidade * percentagemMulta;
    return multa;
  }

  private async calcularValorMensalidade({
    anoLectivo,
    codigoMatricula,
    mesTemp,
    periodosIsentos
  }: CalcularValorMensalidadeParams) {
    const mensalidade = await this.obterMensalidade(
      codigoMatricula,
      anoLectivo,
    );
    const percentagemDesconto = await this.calcularDesconto({
      anoLectivo,
      codigoMatricula,
      mesTemp,
    });
    const bolseiroDesconto = await this.obterBolseiro({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre,
    });
    const isBolseiroIntegral = bolseiroDesconto.desconto == 1;

    const statusPagamento = await this.obterStatusPagamento(
      isBolseiroIntegral,
      codigoMatricula,
      mesTemp.id,
    );
    const desconto = mensalidade * percentagemDesconto;
    const mensalidadeDesconto = mensalidade - desconto;

    const multa = await this.calcularValorMulta(
      codigoMatricula,
      mesTemp,
      percentagemDesconto,
      mensalidadeDesconto,
      periodosIsentos
    );

    const mensalidadeFinal = mensalidadeDesconto + multa;
    const valorPago = isBolseiroIntegral ? mensalidade : 0;

    return {
      mes_temp_id: mesTemp.id,
      mes: mesTemp.designacao,
      data_inicial: null,
      data_final: mesTemp.data_final,
      data_limite: mesTemp.data_limite,
      data_final_desconto: null,
      id_item: 0,
      id_tipo_servico: 0,
      descricao_servico: '',
      tipo_servico: '',
      codigo_matricula: codigoMatricula,
      ano_lectivo_fatura: anoLectivo,
      estado_fatura: statusPagamento,
      reference: '',
      ValorAPagar: mensalidadeFinal,
      valorEntregue: 0,
      data_vencimento: mesTemp.data_limite,
      codigo_factura: 0,
      total_preco_fatura: 0,
      desconto: desconto,
      semestre: mesTemp.semestre,
      multa: multa,
      total_item: mensalidadeFinal,
      valor_pago: valorPago,
      mensalidade: mensalidade,
      total: mensalidadeFinal,
      total_preco: mensalidade,
      status_pagamento: statusPagamento,
    };
  }
  async generatePayment({
    codAnoLectivo,
    codigo_matricula,
    status = 'all',
  }: TestMonthlyDTO) {
    const sqlMesTemp = `
     select
            DATA_LIMITE,
            DATA_FINAL,
            DATA_INICIAL,
            SEMESTRE,
            ID,
            DESIGNACAO,
            PRESTACAO
     from fk2_mes_temp tp
     where 1=1
     and tp.ano_lectivo = :codAnoLectivo
     and tp.activo = 1
     and tp.id not in ( select it.mes_temp_id
     from fk2_factura ft
     inner JOIN fk2_factura_items it
     on ft.codigo = it.codigofactura
     inner join fk2_mes_temp mt
      on mt.id = it.mes_temp_id
     where ft.codigomatricula = :codigo_matricula
     and it.mes_temp_id is not null
     and mt.ano_lectivo = :codAnoLectivo
     and ft.estado != 3
     )
    `;
    const resultado = await this.dataSource.query(sqlMesTemp, {
      codAnoLectivo,
      codigo_matricula,
    } as any);
    const mesTemps: MesTempResponse[] = toLowerCaseKeys(resultado);
    const periodosIsentos = await this.dataSource.query(
      `
      SELECT DATA_INICIO, DATA_FIM
      FROM FK2_TB_DIAS_ISENTOS
      WHERE ESTADO = 1
      `,
    );
    const pagamentos: any = [];
    for (const mesTemp of mesTemps) {
      const result = await this.calcularValorMensalidade({
        anoLectivo: codAnoLectivo,
        codigoMatricula: codigo_matricula,
        mesTemp: mesTemp,
        periodosIsentos
      });

      if (status == 'pending' && result.status_pagamento == 0)
        pagamentos.push(result);
      else if (status == 'paid' && result.status_pagamento == 1) {
        pagamentos.push(result);
      } else if (status == 'all' || status == undefined) {
        pagamentos.push(result);
      }
    }
    return pagamentos;
  }
}
