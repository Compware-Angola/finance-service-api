import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class AcademicActivitiesService {
  constructor(private readonly dataSource: DataSource) { }



  async deleteAcademicActivities(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException('Código do Dia isentos deve ser um número válido');
    }
    await this.findOne(codigoNum)

    const result = await this.dataSource.query(
      `DELETE FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum]
    );



    if (result.affected === 0) {
      throw new Error('Actividade Lectiva não encontrado');
    }
    return { success: true, message: 'Actividade Lectiva  excluído com sucesso' };

  }

  async findOne(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException('Código do Actividade Lectiva deve ser um número válido');
    }
    const activities = await this.dataSource.query(
      `SELECT * FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum]
    );
    console.log(activities);

    if (activities.length === 0) {
      throw new NotFoundException(`Actividade Lectiva com código ${codigo} não encontrada`);
    }

    return await toLowerCaseKeys(activities[0]);
  }


}
