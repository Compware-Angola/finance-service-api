import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { UpdateExemptDayDto } from './dto/update-exempt_day.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class ExemptDaysService {
  constructor(private readonly dataSource: DataSource) { }



  async deleteExemptDay(codigo: number): Promise<{ success: boolean; message: string }> {

    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException('Código da sala deve ser um número válido');
    }
    // 1. Verifica se existe
    const existe = await this.dataSource.query(
      `SELECT OBSERVACAO,CODIGO FROM FK2_TB_DIAS_ISENTOS WHERE CODIGO = :codigoNum`,
      [codigoNum]
    );
    if (existe.length === 0) {
      throw new NotFoundException(`Dia Isentos com código ${codigo} não encontrada`);
    }
    const result = await this.dataSource.query(
      `DELETE FROM FK2_TB_DIAS_ISENTOS WHERE CODIGO = :codigoNum`,
      [codigoNum]
    );



    if (result.affected === 0) {
      throw new Error('Dia isento não encontrado');
    }
    return { success: true, message: 'Dia isento excluído com sucesso' };
  }
  // src/periodos/periodos.service.ts (ou onde estiver o teu service)
async updateExemptDay(
  codigo: number | string,
  dto: UpdateExemptDayDto,
): Promise<any> {
  const codigoNum = Number(codigo);
  if (isNaN(codigoNum)) {
    throw new BadRequestException('Código inválido');
  }

  // Verifica se existe
  const exists = await this.getExemptDayById(codigoNum);
  if (!exists) {
    throw new NotFoundException(`Dia isento com código ${codigo} não encontrado`);
  }

  const fieldMap: Record<string, string> = {
    dataInicio: 'DATA_INICIO',
    dataFim: 'DATA_FIM',
    observacao: 'OBSERVACAO',
    estado: 'ESTADO',
  };

  const updates: string[] = [];
  const params: any = { codigoNum };

  Object.keys(dto).forEach((key) => {
    const dbColumn = fieldMap[key];
    if (dbColumn && dto[key] !== undefined) {
      const paramName = key;

      if (key === 'dataInicio' || key === 'dataFim') {
        if (!dto[key] || dto[key] === '') {
          updates.push(`${dbColumn} = NULL`);
        } else {
          updates.push(`${dbColumn} = TO_DATE(:${paramName}, 'YYYY-MM-DD')`);
          params[paramName] = dto[key]; // string no formato YYYY-MM-DD
        }
      } else {
        updates.push(`${dbColumn} = :${paramName}`);
        params[paramName] = dto[key] === '' ? null : dto[key];
      }
    }
  });

  if (updates.length === 0) {
    throw new BadRequestException('Nenhum campo para atualizar');
  }


  const query = `
    UPDATE FK2_TB_DIAS_ISENTOS
    SET ${updates.join(', ')}
    WHERE CODIGO = :codigoNum
  `;

  await this.dataSource.query(query, params);

  const updated = await this.getExemptDayById(codigoNum);
  return {
    success: true,
    message: 'Dia isento atualizado com sucesso',
    data: updated,
  };
}
async getExemptDayById(codigo: number | string): Promise<any> {
  const codigoNum = Number(codigo);
  if (isNaN(codigoNum)) {
    throw new BadRequestException('Código do Dia isentos deve ser um número válido');
  }
  const days = await this.dataSource.query(
    `SELECT * FROM FK2_TB_DIAS_ISENTOS WHERE CODIGO = :codigoNum`,
   [codigoNum]
  );
  console.log(days);
  
  if (days.length === 0) {
    throw new NotFoundException(`Dia isentos com código ${codigo} não encontrada`);
  }

  return   await toLowerCaseKeys(days[0]);
}

}
