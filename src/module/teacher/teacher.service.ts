import { Injectable } from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class TeacherService {
       constructor(private readonly dataSource: DataSource) { }


       async profile(userId: number) {

              const query = `
SELECT
        -- Dados pessoais
        td.CODIGO                         AS codigo_docente,
        tu.EMAIL                          AS email,
        tu.USERNAME                       AS username,
        tu.nome                           AS nome,
        pe.NOME_DO_PAI                    AS nome_pai,
        pe.NOME_DA_MAE                    AS nome_mae,
        pe.DATA_DE_NASCIMENTO             AS data_nascimento,
        pe.NUM_DOC_IDENTIFICACAO          AS numero_documento,
        pe.DATA_DE_EMISSAO_DOCUMENTO      AS data_emissao,
        pe.ENDERECO                       AS endereco,
        pe.TELEFONE1                      AS contacto_1,
        pe.TELEFONE2                      AS contacto_2,

        -- Dados do Docente
        td.N_MECANOGRAFICO                AS n_mecanografico,
        td.FK_ESCALAO                     AS codigo_escalao,
        td.DATAINICIODOCENCIA                     AS data_inicio_docente,
        td.TB_CATEGORIA_DOCENTE           AS codigo_categoria,
        cd.DESIGNACAO                     AS descricao_categoria,
        ed.DESIGNACAO                     AS escalao,
        ga.DESIGNACAO                     AS descricao_grau_academico,
        fa.DESIGNACAO                     AS faculdade_designacao
FROM FK2_MCA_TB_UTILIZADOR         tu 
LEFT JOIN FK2_MGD_TB_DOCENTE       td  ON json_value(td.CODIGO_UTILIZADOR,'$.pk') = tu.PK_UTILIZADOR
LEFT JOIN FK2_TB_ESCALAO_DOCENTE   ed  ON ed.codigo = td.FK_ESCALAO
LEFT JOIN FK2_TB_CATEGORIA_DOCENTE cd  ON cd.codigo = td.TB_CATEGORIA_DOCENTE
LEFT JOIN FK2_MGD_TB_CANDIDATURA   ccc ON ccc.codigo = td.FK_CANDIDATURA
LEFT JOIN FK2_TB_GRAU_ACADEMICO    ga  ON ga.codigo = ccc.GRAU_ACADEMICO
LEFT JOIN FK2_TB_PESSOA            pe  ON pe.pk_pessoa = json_value(tu.REF_PESSOA,'$.pk')
LEFT JOIN FK2_TB_FACULDADE         fa  ON fa.codigo = td.faculdade
WHERE tu.PK_UTILIZADOR = :1
`;

              const teacherData = await this.dataSource.query(query, [userId]);


              return {
                     success: true,
                     data: await toLowerCaseKeys(teacherData),
              };
       }

}
