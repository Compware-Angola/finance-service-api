import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, IsNull, Repository } from 'typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';
import { ListCashRegistersDto } from './dto/list-cash-registers.dto';
import { OpenCashRegisterParams } from './types';
import {
  AdminStatus,
  CashRegisterStatus,
  FinalStatus,
  PaymentMethod,
  YesNo,
} from './enums/cash-register-status.enum';
import { randomInt } from 'crypto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListOperatorsDto } from './dto/list-operators.dto';
import { ListCashRegisterMovementsDto } from './dto/ist-movements.dto';
import { formatTime } from '../util/formatTime';
import { HttpService } from '@nestjs/axios';
import { HashHelper } from 'src/common/helpers/hash-helper';
// import { EmailHelper } from 'src/common/helpers/email.helper';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';

type ValidateMovementParams = {
  id: number;
  action: 'approved' | 'rejected';
  rejectionReason?: string;
};

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(CashRegisterMovement)
    private readonly cashRegisterMovementRepository: Repository<CashRegisterMovement>,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: ListCashRegistersDto) {
    const { page = 1, limit = 10 } = filters || {};
    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'C.CODIGO AS code',
        'C.NOME AS name',
        'C.STATUS_ AS status',
        'C.BLOQUEIO AS blocked',
        'UTI.PK_UTILIZADOR AS operator_code',
        'UTI.NOME AS operator_name',
      ])
      .from('FK2_TB_CAIXAS', 'C')
      .leftJoin(
        'FK2_MCA_TB_UTILIZADOR',
        'UTI',
        'UTI.PK_UTILIZADOR = C.OPERADOR_ID',
      )
      .where('C.DELETED_AT IS NULL');

    if (filters?.search?.trim()) {
      const search = `%${filters.search.trim().toUpperCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(C.NOME) LIKE UPPER(:search)', { search }).orWhere(
            'UPPER(UTI.NOME) LIKE UPPER(:search)',
            { search },
          );
        }),
      );
    }

    if (filters?.status) {
      queryBuilder.andWhere('C.STATUS_ = :status', { status: filters.status });
    }

    if (filters?.blocked) {
      queryBuilder.andWhere('C.BLOQUEIO = :blocked', {
        blocked: filters.blocked,
      });
    }

    const countQueryBuilder = queryBuilder.clone();

    queryBuilder.orderBy('C.CODIGO', 'DESC').offset(offset).limit(limit);
    const [results, totalResult] = await Promise.all([
      queryBuilder.getRawMany(),
      countQueryBuilder.select('COUNT(*) AS TOTAL').getRawOne(),
    ]);

    const total = parseInt(totalResult?.TOTAL || '0', 10);

    return {
      data: toLowerCaseKeys(results),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caixa não encontrado');
    }

    return cashRegister;
  }

  async create(dto: CreateCashRegisterDto, adminId: number) {
    const exists = await this.cashRegisterRepository.findOne({
      where: {
        name: dto.name,
        deletedAt: IsNull(),
      },
    });

    if (exists) {
      throw new BadRequestException('Já existe um caixa com este nome');
    }

    const cashRegister = this.cashRegisterRepository.create({
      name: dto.name,
      status: CashRegisterStatus.CLOSED,
      blocked: YesNo.NO,
      createdBy: adminId,
    });

    return await this.cashRegisterRepository.save(cashRegister);
  }

  async update(id: number, dto: UpdateCashRegisterDto, adminId: number) {
    const cashRegister = await this.findById(id);

    if (cashRegister.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('Não é possível editar um caixa aberto');
    }

    Object.assign(cashRegister, dto);

    cashRegister.updatedBy = adminId;

    return await this.cashRegisterRepository.save(cashRegister);
  }

  async delete(id: number, adminId: number) {
    const cashRegister = await this.findById(id);

    if (cashRegister.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('Não é possível eliminar um caixa aberto');
    }

    cashRegister.deletedAt = new Date();
    cashRegister.deletedBy = adminId;

    await this.cashRegisterRepository.save(cashRegister);

    return {
      message: 'Caixa eliminado com sucesso',
    };
  }

  async open(params: OpenCashRegisterParams) {
    const { id, openingAmount, operatorId, adminId } = params;

    return this.dataSource.transaction(async (manager) => {
      const cashRegisterRepository = manager.getRepository(CashRegister);
      const movementRepository = manager.getRepository(CashRegisterMovement);
      const operatorCashRegister = await cashRegisterRepository.findOne({
        where: {
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });
      if (operatorCashRegister) {
        throw new BadRequestException('Operador já possui um caixa aberto');
      }
      const cashRegister = await cashRegisterRepository.findOne({
        where: {
          id,
          deletedAt: IsNull(),
        },
      });

      if (!cashRegister) {
        throw new NotFoundException('Caixa não encontrado');
      }

      this.validateCashRegisterAvailability(cashRegister);
      const openingCode = generateRandomCode();
      // const hashOpeningCode = await HashHelper.generateHash(
      //   this.httpService,
      //   openingCode.toString(),
      // );
      cashRegister.status = CashRegisterStatus.OPEN;
      cashRegister.operatorId = operatorId;
      cashRegister.blocked = YesNo.YES;
      cashRegister.code = openingCode.toString();
      cashRegister.createdBy = adminId;
      await cashRegisterRepository.save(cashRegister);
      const movement = movementRepository.create({
        cashRegisterId: cashRegister.id,
        operatorId,
        openingAmount,
        totalCollectedAmount: 0,
        collectedDepositAmount: 0,
        collectedPaymentAmount: 0,
        invoicedPaymentAmount: 0,
        collectedTpaAmount: 0,
        createdBy: adminId,
        status: CashRegisterStatus.OPEN,
        finalStatus: 'pendente',
        adminStatus: 'pendente',
        dateAt: new Date(),
        createdAt: new Date(),
        startTime: formatTime(new Date()),
      });

      await movementRepository.save(movement);
      const { code, ...rest } = cashRegister;
      // const email = await this.findOperatorEmail(operatorId);
      // EmailHelper.sendEmail(this.httpService, {
      //   to: email,
      //   subject: 'Caixa aberto',
      //   company: 'universidade_metodista_angola',
      //   type: 'codigo_validacao_abertura_caixa',
      //   context: {
      //     codigo_abertura: openingCode,
      //     operador: operatorId,
      //     valor_abertura: openingAmount,
      //     data_abertura: new Date().toLocaleDateString(),
      //     hora_abertura: formatTime(new Date()),
      //   },
      // });
      return { ...rest, code };
    });
  }
  async verifyMyCashRegister({
    openingCode,
    operatorId,
  }: {
    openingCode: string;
    operatorId: number;
  }) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caixa não encontrado');
    }
    if (!cashRegister.code) {
      throw new BadRequestException('Código de abertura inválido');
    }
    const isValidCode = openingCode === cashRegister.code;
    // const isValidCode = await HashHelper.verifyHash(
    //   this.httpService,
    //   openingCode.toString(),
    //   cashRegister.code,
    // );
    // console.log(isValidCode);

    if (!isValidCode) {
      throw new BadRequestException('Código de abertura inválido');
    }
    cashRegister.blocked = YesNo.NO;
    await this.cashRegisterRepository.save(cashRegister);
    const rest = cashRegister;
    return rest;
  }

  async close(cashRegisterId: number, operatorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const cashRegisterRepository = manager.getRepository(CashRegister);
      const movementRepository = manager.getRepository(CashRegisterMovement);
      const operatorCashRegister = await cashRegisterRepository.findOne({
        where: {
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });
      if (!operatorCashRegister) {
        throw new BadRequestException('Operador não possui caixa aberto');
      }
      const cashRegister = await cashRegisterRepository.findOne({
        where: {
          id: cashRegisterId,
          deletedAt: IsNull(),
        },
      });

      if (!cashRegister) {
        throw new NotFoundException('Caixa não encontrado');
      }

      const movement = await movementRepository.findOne({
        where: {
          cashRegisterId,
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });
      if (!movement) {
        throw new NotFoundException(
          'Movimento de caixa em aberto não encontrado',
        );
      }
      const { totalCash, totalCard } = await this.calculateCashRegisterSummary({
        operatorId,
        cashRegisterId: cashRegister.id,
        createdAt: movement.createdAt,
      });
      const closingDate = new Date();

      movement.status = CashRegisterStatus.CLOSED;
      movement.finalStatus = 'fechado';
      movement.adminStatus = 'pendente';
      movement.closingDate = closingDate;
      movement.closingTime = formatTime(new Date());
      movement.collectedPaymentAmount = totalCash;
      movement.collectedTpaAmount = totalCard;
      movement.totalCollectedAmount =
        Number(movement.openingAmount ?? 0) + totalCash + totalCard;

      operatorCashRegister.status = CashRegisterStatus.CLOSED;
      operatorCashRegister.operatorId = null as any;
      operatorCashRegister.code = null as any;
      await movementRepository.save(movement);
      await cashRegisterRepository.save(operatorCashRegister);
      return movement;
    });
  }

  async findOpenByOperatorId(operatorId: number) {
    return this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        status: CashRegisterStatus.OPEN,
        deletedAt: IsNull(),
      },
    });
  }

  async findAvailableForOpening(search?: string) {
    const query =
      this.cashRegisterRepository.createQueryBuilder('cashRegister');

    query
      .where('cashRegister.deletedAt IS NULL')
      .andWhere('cashRegister.blocked = :blocked', {
        blocked: YesNo.NO,
      })
      .andWhere('cashRegister.status = :status', {
        status: CashRegisterStatus.CLOSED,
      });

    if (search?.trim()) {
      const normalized = `%${search.trim().toUpperCase()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(cashRegister.name) LIKE :search', {
            search: normalized,
          }).orWhere('UPPER(cashRegister.code) LIKE :search', {
            search: normalized,
          });
        }),
      );
    }

    query.orderBy('cashRegister.id', 'DESC');

    return query.getMany();
  }

  async validateOperatorOpenCashRegister(operatorId: number) {
    return await this.findOpenByOperatorId(operatorId);
  }

  async listAvailableOperators(query: ListOperatorsDto) {
    const { page = 1, limit = 10, search = '', availability = 'free' } = query;

    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [utilizadores, totalResult] = await Promise.all([
      this.dataSource.query(
        `
      SELECT uti.NOME, uti.PK_UTILIZADOR AS codigo
      FROM FK2_MCA_TB_UTILIZADOR uti
      INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
        ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
      LEFT JOIN FK2_TB_CAIXAS caixas
        ON caixas.OPERADOR_ID = uti.PK_UTILIZADOR
        AND caixas.DELETED_AT IS NULL
      WHERE grupo_uti.FK_GRUPO IN (14, 9)
      ${availability === 'free' ? 'AND caixas.OPERADOR_ID IS NULL' : ''}
      ${availability === 'occupied' ? 'AND caixas.OPERADOR_ID IS NOT NULL' : ''}
      AND (
        LOWER(uti.NOME) LIKE LOWER(:1)
        OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
      )
      ORDER BY uti.NOME
      OFFSET :3 ROWS FETCH NEXT :4 ROWS ONLY
      `,
        [searchParam, searchParam, offset, limit],
      ),

      this.dataSource.query(
        `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_MCA_TB_UTILIZADOR uti
      INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
        ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
      LEFT JOIN FK2_TB_CAIXAS caixas
        ON caixas.OPERADOR_ID = uti.PK_UTILIZADOR
        AND caixas.DELETED_AT IS NULL
      WHERE grupo_uti.FK_GRUPO IN (14, 9)
      AND caixas.OPERADOR_ID IS NULL
      AND (
        LOWER(uti.NOME) LIKE LOWER(:1)
        OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
      )
      `,
        [searchParam, searchParam],
      ),
    ]);

    const total = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(utilizadores),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private validateCashRegisterAvailability(cashRegister: CashRegister) {
    if (cashRegister.blocked === YesNo.YES) {
      throw new BadRequestException('Caixa bloqueado');
    }

    if (cashRegister.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('Caixa já está aberto');
    }
  }
  private async calculateCashRegisterSummary(params: {
    operatorId: number;
    cashRegisterId: number;
    createdAt: Date;
  }) {
    const result = await this.dataSource.query(
      `
    SELECT
      SUM(
        CASE
          WHEN pagamentos.FORMA_PAGAMENTO = ${PaymentMethod.CASH}
          THEN pagamentos.VALOR_DEPOSITADO
          ELSE 0
        END
      ) AS total_cash,

      SUM(
        CASE
          WHEN pagamentos.FORMA_PAGAMENTO =${PaymentMethod.CARD}
          THEN pagamentos.VALOR_DEPOSITADO
          ELSE 0
        END
      ) AS total_card
    FROM FK2_TB_PAGAMENTOS pagamentos
    WHERE pagamentos.FK_UTILIZADOR = :1
      AND pagamentos.CAIXA_ID = :2
      AND pagamentos.ESTADO = 2
      AND pagamentos.CREATED_AT >= :3
    `,
      [params.operatorId, params.cashRegisterId, params.createdAt],
    );
    console.log(result);
    return {
      totalCash: Number(result[0]?.TOTAL_CASH || 0),
      totalCard: Number(result[0]?.TOTAL_CARD || 0),
    };
  }

  async findMovements(filters?: ListCashRegisterMovementsDto) {
    const {
      page = 1,
      limit = 10,
      status,
      cashRegisterId,
      operatorId,
      startDate,
      endDate,
    } = filters || {};

    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'C.CODIGO AS code',
        'C.CAIXA_ID AS cash_register_id',
        'CA.NOME AS cash_register_name',
        'C.OPERADOR_ID AS operator_id',
        'C.VALOR_ABERTURA AS opening_amount',
        'C.VALOR_ARRECADADO_TOTAL AS total_collected_amount',
        'C.VALOR_ARRECADADO_DEPOSITOS AS collected_deposit_amount',
        'C.VALOR_ARRECADADO_TPA AS collected_tpa_amount',
        'C.VALOR_ARRECADADO_PAGAMENTO AS collected_payment_amount',
        'C.VALOR_FACTURADO_PAGAMENTO AS invoiced_payment_amount',
        'C.STATUS_ AS status',
        'C.STATUS_FINAL AS final_status',
        'C.STATUS_ADMIN AS admin_status',
        'C.OBSERVACAO AS observation',
        'C.DATA_AT AS date_at',
        'C.DATA_FECHO AS closing_date',
        'C.DATA_VALIDACAO AS validation_date',
        'UTI.PK_UTILIZADOR AS operator_code',
        'UTI.NOME AS operator_name',
        'C.CREATED_AT AS created_at',
        'C.UPDATED_AT AS updated_at',
        'C.HORA_INICIO AS opening_time',
        'C.HORA_FECHO AS closing_time',
        'C.HORA_VALIDACAO AS validation_time',
      ])
      .from('FK2_TB_MOVIMENTOS_CAIXAS', 'C')
      .leftJoin(
        'FK2_MCA_TB_UTILIZADOR',
        'UTI',
        'UTI.PK_UTILIZADOR = C.OPERADOR_ID',
      )
      .leftJoin('FK2_TB_CAIXAS', 'CA', 'CA.CODIGO = C.CAIXA_ID')
      .where('C.DELETED_AT IS NULL');

    if (filters?.search?.trim()) {
      const search = `%${filters.search.trim().toUpperCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(CA.NOME) LIKE UPPER(:search)', { search })
            .orWhere('UPPER(UTI.NOME) LIKE UPPER(:search)', { search })
            .orWhere('UPPER(C.STATUS_) LIKE UPPER(:search)', { search });
        }),
      );
    }

    if (status) {
      queryBuilder.andWhere('C.STATUS_ = :status', { status });
    }

    if (cashRegisterId) {
      queryBuilder.andWhere('C.CAIXA_ID = :cashRegisterId', { cashRegisterId });
    }

    if (operatorId) {
      queryBuilder.andWhere('C.OPERADOR_ID = :operatorId', { operatorId });
    }

    if (startDate) {
      queryBuilder.andWhere("C.DATA_AT >= TO_DATE(:startDate, 'YYYY-MM-DD')", {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere("C.DATA_AT < TO_DATE(:endDate, 'YYYY-MM-DD') + 1", {
        endDate,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        "C.DATA_AT BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD') + 1 - (1/86400)",
        { startDate, endDate },
      );
    }

    const countQueryBuilder = queryBuilder.clone();

    queryBuilder.orderBy('C.CODIGO', 'DESC').offset(offset).limit(limit);

    const [results, totalResult] = await Promise.all([
      queryBuilder.getRawMany(),
      countQueryBuilder.select('COUNT(*) AS TOTAL').getRawOne(),
    ]);

    const total = parseInt(totalResult?.TOTAL || '0', 10);

    return {
      data: toLowerCaseKeys(results),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async validateMovement(params: ValidateMovementParams) {
    const { id, action, rejectionReason } = params;

    const movement = await this.cashRegisterMovementRepository.findOne({
      where: { id },
    });

    if (!movement) {
      throw new BadRequestException('Movimento não encontrado');
    }

    if (movement.status !== CashRegisterStatus.CLOSED) {
      throw new BadRequestException(
        'Apenas movimentos fechados podem ser validados',
      );
    }
    movement.validationDate = new Date();
    movement.validationTime = formatTime(new Date());
    if (action === 'approved') {
      movement.adminStatus = AdminStatus.VALIDATED;
      movement.finalStatus = FinalStatus.COMPLETE;
    } else {
      movement.adminStatus = AdminStatus.NOT_VALIDATED;
      movement.finalStatus = FinalStatus.PENDING;
      movement.observation = rejectionReason || 'Movimento rejeitado';
    }

    return await this.cashRegisterMovementRepository.save(movement);
  }

  async recoveryOpeningCode(operatorId: number) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caixa não encontrado');
    }

    const openingCode = generateRandomCode();

    // const hashOpeningCode = await HashHelper.generateHash(
    //   this.httpService,
    //   openingCode.toString(),
    // );

    cashRegister.code = openingCode.toString();

    await this.cashRegisterRepository.save(cashRegister);

    // const operatorEmail = await this.findOperatorEmail(operatorId);

    // EmailHelper.sendEmail(this.httpService, {
    //   to: operatorEmail,
    //   subject: 'Recuperação de código de abertura de caixa',
    //   company: 'universidade_metodista_angola',
    //   type: 'recuperacao_codigo_abertura_caixa',
    //   template:
    //     'universidade_metodista_angola:recuperacao_codigo_abertura_caixa',
    //   context: {
    //     nome: 'Operador',
    //     codigo_abertura: openingCode,
    //   },
    // });
    return { openingCode };
  }

  async blockMyCashRegister(operatorId: number) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      return null;
    }

    cashRegister.blocked = YesNo.YES;
    await this.cashRegisterRepository.save(cashRegister);
    const { code, ...rest } = cashRegister;
    return rest;
  }

  private async findOperatorEmail(id: number) {
    const [data] = await this.dataSource.query<
      {
        EMAIL: string;
      }[]
    >(
      `
    SELECT
    uti.EMAIL
    FROM FK2_MCA_TB_UTILIZADOR uti
    WHERE uti.PK_UTILIZADOR = :1
    `,
      [id],
    );
    if (!data) {
      throw new BadRequestException(
        'Operador nao tem email cadastrado, por favor cadastre o email',
      );
    }
    return data.EMAIL;
  }
}

function generateRandomCode() {
  const coded = randomInt(100000, 999999);

  return coded;
}
