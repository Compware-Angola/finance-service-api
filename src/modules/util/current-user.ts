import { DataSource, QueryRunner } from 'typeorm';

export const currentUsername = async (
  userId: number,
  dataSource: DataSource | QueryRunner,
) => {
  const result = await dataSource.query(
    `select NOME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
    [userId],
  );
  if (!result || result.length === 0) {
    throw new Error(`Usuário não encontrado ${userId}`);
  }

  return result[0].NOME as string;
};
