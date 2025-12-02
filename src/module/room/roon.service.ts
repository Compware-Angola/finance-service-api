// room.service.ts (versão final com query nativa + array [])
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { UpdateRoonDto } from './dto/update-roon.dto';

@Injectable()
export class RoomService {
  constructor(private readonly dataSource: DataSource) {}

async createRoom(dto: any) {
  const {
    designacao, tipo_sala, numero, estado = 'Ativa', capacidade,
    polo_id, piso_id, edificio_id,
    comprimento, largura, area,
    num_ac, num_lampadas, num_janelas,
    area_aluno, utilizavel = 'Sim', capacidade_exame_acesso_prova,
  } = dto;

  // 1. Verifica duplicidade
  const existe = await this.dataSource.query(
    `SELECT 1 FROM FK2_TB_SALAS WHERE NUMERO = :numero AND DELETED_AT IS NULL`,
   [numero]
  );
  if (existe.length > 0) throw new BadRequestException('Número já existe');

  // 2. Próximo código
  const [result] = await this.dataSource.query(`
    SELECT NVL(MAX(TO_NUMBER(CODIGO)), 0) + 1 AS next_val
    FROM FK2_TB_SALAS
    WHERE REGEXP_LIKE(CODIGO, '^[0-9]+$')
  `);
  console.log(result);
  
  const proximoCodigo = (result?.NEXT_VAL || 1);

  // 3. INSERT com parâmetros nomeados (OBRIGATÓRIO no Oracle com TypeORM thin)
await this.dataSource.query(
  `
    INSERT INTO FK2_TB_SALAS (
      DESIGNACAO, TIPO_SALA, NUMERO, ESTADO, CAPACIDADE,
      POLO_ID, PISO_ID, EDIFICIO_ID,
      COMPRIMENTO, LARGURA, AREA,
      NUM_AC, NUM_LAMPADAS, NUM_JANELAS,
      AREA_ALUNO, UTILIZAVEL, CAPACIDADEEXAMEACESSOPROVA,
      CODIGO, UPDATED_AT, DELETED_AT
    ) VALUES (
      :designacao, :tipo_sala, :numero, :estado, :capacidade,
      :polo_id, :piso_id, :edificio_id,
      :comprimento, :largura, :area,
      :num_ac, :num_lampadas, :num_janelas,
      :area_aluno, :utilizavel, :capacidade_exame,
      :codigo, SYSDATE, NULL
    )
  `,
  {
    designacao,
    tipo_sala,
    numero,
    estado,
    capacidade,
    polo_id,
    piso_id,
    edificio_id,
    comprimento: comprimento || null,
    largura: largura || null,
    area: area || null,
    num_ac: num_ac || null,
    num_lampadas: num_lampadas || null,
    num_janelas: num_janelas || null,
    area_aluno: area_aluno || null,
    utilizavel,
    capacidade_exame: capacidade_exame_acesso_prova || null,
    codigo: Number(proximoCodigo),
  } as any  // ← Esta linha resolve o erro do TypeScript
);
  // 4. Retorna
  const [sala] = await this.dataSource.query(
    `SELECT * FROM FK2_TB_SALAS WHERE CODIGO = :codigo`,
    { codigo: proximoCodigo } as any
  );

  return { success: true, message: 'Sala criada!', data: await toLowerCaseKeys(sala) };
}

async getAllTypeRooms() {
  const tipos = await this.dataSource.query(
    `SELECT CODIGO,DESCRICAO FROM FK2_TB_TIPO_SALA ORDER BY CODIGO`
  );
  return { success: true, data: await toLowerCaseKeys(tipos) };
}
async deleteRoom(codigo: number | string): Promise<{ success: true; message: string }> {
  const codigoNum = Number(codigo);
  if (isNaN(codigoNum)) {
    throw new BadRequestException('Código da sala deve ser um número válido');
  }
  // 1. Verifica se existe
  const existe = await this.dataSource.query(
    `SELECT DESIGNACAO,CODIGO FROM FK2_TB_SALAS WHERE CODIGO = :codigoNum`,
   [codigoNum]
  );

  if (existe.length === 0) {
    throw new NotFoundException(`Sala com código ${codigo} não encontrada`);
  }
  const result = await this.dataSource.query(
    `UPDATE FK2_TB_SALAS 
     SET DELETED_AT = SYSDATE 
     WHERE CODIGO = :codigoNum 
    `,
   [codigoNum]
  );

  

  if (result && result > 0) {
   
    const salaDeletada = existe[0];
    return {
      success: true,
      message: `Sala ${salaDeletada.DESIGNACAO} (código ${salaDeletada.CODIGO}) foi excluída com sucesso`,
    };
  } else {
    throw new NotFoundException(`Sala com código ${codigo} não encontrada ou já excluída`);
  }
}
async fecthAllRooms(): Promise<{ success: true; data: any[] }> {
  const rooms = await this.dataSource.query(`
    SELECT * FROM FK2_TB_SALAS
    WHERE DELETED_AT IS NULL
    ORDER BY CODIGO DESC
  `);
  return { success: true, data: await toLowerCaseKeys(rooms) };
}

async getRoomById(codigo: number | string): Promise<any> {
  const codigoNum = Number(codigo);
  if (isNaN(codigoNum)) {
    throw new BadRequestException('Código da sala deve ser um número válido');
  }
  const room = await this.dataSource.query(
    `SELECT * FROM FK2_TB_SALAS WHERE CODIGO = :codigoNum AND DELETED_AT IS NULL`,
   [codigoNum]
  );
  if (room.length === 0) {
    throw new NotFoundException(`Sala com código ${codigo} não encontrada`);
  }

  return   await toLowerCaseKeys(room[0]);
}

async updateRoom(
  codigo: number | string,
  dto: UpdateRoonDto, // usa o teu DTO com os campos corretos
): Promise<{ success: true; message: string; data: any }> {
  const codigoNum = Number(codigo);
  if (isNaN(codigoNum)) {
    throw new BadRequestException('Código da sala deve ser um número válido');
  }

  // Verifica se existe
  const roomExists = await this.getRoomById(codigoNum);
  if (!roomExists) {
    throw new NotFoundException(`Sala com código ${codigo} não encontrada`);
  }

  // Mapeamento correto: frontend → coluna do banco (UPPER_SNAKE_CASE)
  const fieldMap: Record<string, string> = {
    designacao: 'DESIGNACAO',
    tipo_sala: 'TIPO_SALA',
    numero: 'NUMERO',
    estado: 'ESTADO',
    capacidade: 'CAPACIDADE',
    polo_id: 'POLO_ID',
    piso_id: 'PISO_ID',
    edificio_id: 'EDIFICIO_ID',
    comprimento: 'COMPRIMENTO',
    largura: 'LARGURA',
    area: 'AREA',
    num_ac: 'NUM_AC',
    num_lampadas: 'NUM_LAMPADAS',
    num_janelas: 'NUM_JANELAS',
    area_aluno: 'AREA_ALUNO',
    utilizavel: 'UTILIZAVEL',
    capacidade_exame_acesso_prova: 'CAPACIDADEEXAMEACESSOPROVA', // campo certo!
  };

  // Filtra apenas os campos que vieram no DTO e que existem no map
  const updates: string[] = [];
  const params: any = { codigoNum };

  Object.keys(dto).forEach((key) => {
    const dbColumn = fieldMap[key];
    if (dbColumn && dto[key] !== undefined) {
      const paramName = key;
      updates.push(`${dbColumn} = :${paramName}`);
      params[paramName] = dto[key] === '' ? null : dto[key]; // trata string vazia como null
    }
  });

  // Se não houver campos para atualizar
  if (updates.length === 0) {
    throw new BadRequestException('Nenhum campo válido para atualizar');
  }

  // Adiciona updated_at automaticamente
  updates.push(`UPDATED_AT = SYSDATE`);

  // Monta e executa a query
  const query = `
    UPDATE FK2_TB_SALAS 
    SET ${updates.join(', ')} 
    WHERE CODIGO = :codigoNum
  `;

  await this.dataSource.query(query, params);

  // Retorna a sala atualizada
  const updatedRoom = await this.getRoomById(codigoNum);
  return {
    success: true,
    message: 'Sala atualizada com sucesso',
    data: updatedRoom.data,
  };
}
}