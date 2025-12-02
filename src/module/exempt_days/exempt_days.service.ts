import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';

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
}
