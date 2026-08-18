import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentReferenceDto } from './dto/create-payment-reference.dto';
import { generateDueDate } from '../../util/generate-due-date';
import { generateReferenceNumber } from '../../util/generate-refence-number';
import { AppyPayUtil } from '../../util/appypay/appy-pay-util';
import { InvoiceService } from '../../invoice/invoice.service';
import { CreateInvoiceDto } from '../../invoice/dto/create-invoice.dto';
import * as oracledb from 'oracledb';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentReferences } from './entities/payment-reference.entity';
import { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { RegisterPaymentReferenceDto } from './dto/register-payment-reference.dto';
import { InvoiceItem } from '../../invoice/entities/InvoiceIten.entity';
import { MesTemp } from './entities/mes-temp.entity';
import { AcademicYear } from 'src/modules/invoice/entities/academic.year.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from 'src/common/constants/queue.constant';
import { InvoiceItemDto } from 'src/modules/invoice/dto/create-invoice-itens.dto';

@Injectable()
export class PaymentReferencesService {
  private readonly logger = new Logger(PaymentReferencesService.name);

  constructor(
    @InjectQueue(QueueName.PAYMENT_REFERENCE_SERVICE)
    private readonly paymentReferenceQueue: Queue,
    @InjectRepository(MesTemp)
    private readonly mesTempRepository: Repository<MesTemp>,
    @InjectRepository(PaymentReferences)
    private readonly paymentReferencesRepository: Repository<PaymentReferences>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly dataSource: DataSource,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,
    private readonly invoiceService: InvoiceService,
    private readonly appyPayUtil: AppyPayUtil,
  ) {
    PaymentReferences.setRepository(this.paymentReferencesRepository);
  }

  async create(createPaymentReferenceDto: CreatePaymentReferenceDto) {
    const { ...payments } = createPaymentReferenceDto;

    // 🕒 Gera dueDate e referenceNumber em paralelo
    const [dueDate, referenceNumber] = await Promise.all([
      generateDueDate(3),
      generateReferenceNumber(),
    ]);

    // 📦 Monta payload para AppyPay
    const payload = this.appyPayUtil.buildPayload({
      amount: payments.amount,
      currency: payments.currency,
      description: payments.description,
      dueDate,
      referenceNumber,
      notify: payments.notify,
    });

    // 🚀 Cria a referência no AppyPay
    const appyResponse = await this.appyPayUtil.createPaymentReference(payload);
    const status = appyResponse?.responseStatus;

    if (!status?.successful || !status?.reference?.referenceNumber) {
      this.logger.error('Falha ao gerar referência no AppyPay', appyResponse);
      throw new BadGatewayException(
        'Falha ao gerar referência de pagamento. A fatura não será criada.',
      );
    }

    return status;
  }

  // No teu service (ex: PaymentReferencesService)
  async registerPaymentReference(
    dto: RegisterPaymentReferenceDto,
    manager?: EntityManager,
  ): Promise<PaymentReferences> {
    // Caso 1: Transação externa (já veio manager → não commit/rollback aqui)
    if (manager) {
      return this.registerPaymentReferenceInternal(dto, manager);
    }

    // Caso 2: Transação interna (criamos e controlamos o queryRunner)
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.registerPaymentReferenceInternal(
        dto,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Erro ao registar referência de pagamento (transação interna)',
        err?.stack,
      );

      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      throw new InternalServerErrorException(
        'Erro interno ao registar referência de pagamento. Tente novamente.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lógica principal de registo da referência.
   * Sempre recebe um EntityManager válido.
   */
  private async registerPaymentReferenceInternal(
    dto: RegisterPaymentReferenceDto,
    manager: EntityManager,
  ): Promise<PaymentReferences> {
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const ultimoSource = await manager.query(`
  SELECT SOURCE_ID,
         TO_NUMBER(REGEXP_SUBSTR(SOURCE_ID, '^\\d+')) AS parte_numerica
  FROM FK2_PAGAMENTO_POR_REFERENCIAS
  WHERE REGEXP_LIKE(SOURCE_ID, '^\\d+REF\\d$')  -- exemplo: 414527REF1
  ORDER BY parte_numerica DESC
  FETCH FIRST 1 ROW ONLY
`);

        let nextSourceId = 90000;
        if (ultimoSource?.length > 0 && ultimoSource[0].PARTE_NUMERICA) {
          const lastNum = Number(ultimoSource[0].PARTE_NUMERICA);
          if (!isNaN(lastNum) && lastNum >= 90000) {
            nextSourceId = lastNum + 1;
          }
        }

        const sourceIdGerado = `${nextSourceId}REF1`;

        // 2. INSERT nativo com RETURNING para pegar o ID gerado
        const insertResult = await manager.query(
          `
        INSERT INTO FK2_PAGAMENTO_POR_REFERENCIAS (
          SOURCE_ID,
          FACTURA_CODIGO,
          ENTITY_ID,
          REFERENCE,
          REFERENCE_ID,
          MERCHANT_TRANSACTION_ID,
          AMOUNT,
          START_DATE,
          END_DATE,
          STATUS_,
          WEBHOOK,
          CREATED_AT,
          UPDATED_AT,
          PAYMENT_ID
        ) VALUES (
          :sourceId,
          :facturaCodigo,
          :entityId,
          :reference,
          :referenceId,
          :merchantTransactionId,
          :amount,
          :startDate,
          :endDate,
          :status,
          :webhook,
          SYSDATE,
          SYSDATE,
          :paymentId
        )
        RETURNING ID INTO :outId
      `,
          {
            sourceId: sourceIdGerado,
            facturaCodigo: dto.facturaCodigo ?? null,
            entityId: dto.entityId ?? null,
            reference: dto.reference ?? null,
            referenceId: dto.referenceId ?? null,
            merchantTransactionId: dto.merchantTransactionId ?? null,
            amount: dto.amount ?? 0,
            startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
            endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
            status: dto.status ?? 'Pending',
            webhook: dto.webhook ?? '',
            paymentId: dto.paymentId ?? null,
            outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          } as any,
        );

        const idGerado = insertResult.outId?.[0];

        if (!idGerado) {
          throw new Error('Falha ao recuperar o ID gerado automaticamente');
        }

        // 3. Recarregar a entidade completa com o ID gerado
        const saved = await manager.findOneOrFail(PaymentReferences, {
          where: { id: idGerado },
        });

        this.logger.log(
          `Referência criada com sucesso: SOURCE_ID=${sourceIdGerado} | ID=${saved.id}`,
        );

        return saved;
      } catch (error: any) {
        attempts++;

        // Detectar conflito de unicidade (principalmente no SOURCE_ID)
        const isUniqueViolation =
          error.message?.includes('unique constraint') ||
          error.message?.includes('ORA-00001') ||
          error.code === '23505'; // código genérico de unique violation

        if (isUniqueViolation && attempts < MAX_ATTEMPTS) {
          this.logger.warn(
            `Conflito de unicidade em SOURCE_ID (tentativa ${attempts}/${MAX_ATTEMPTS})`,
          );
          continue; // tenta novamente → novo SOURCE_ID
        }

        this.logger.error(
          'Erro ao inserir referência de pagamento (raw query)',
          error,
        );
        throw error instanceof InternalServerErrorException
          ? error
          : new InternalServerErrorException(
            'Erro ao registar referência de pagamento',
          );
      }
    }

    throw new InternalServerErrorException(
      'Falha ao gerar SOURCE_ID único após várias tentativas. Tente novamente mais tarde.',
    );
  }



  async renewPaymentReference(invoiceId: number): Promise<any> {
    return await this.paymentReferencesRepository.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        // 1. Buscar fatura
        const invoice = await this.invoiceService.findOne(invoiceId);
        if (!invoice) {
          throw new NotFoundException('Fatura não encontrada.');
        }

        // 2. Buscar itens da fatura
        const invoiceItems = await this.invoiceItemRepository.find({
          where: { CodigoFactura: invoice.Codigo },
        });

        const isMensalidade =
          invoiceItems.length === 1 && invoiceItems[0].mesTempId != null;

        const originalAmount = Number(invoice.ValorAPagar);
        let finalAmount = originalAmount;
        const description =
          invoice.Descricao || 'Renovação de referência de pagamento';

        if (isMensalidade) {
          const { preco, multa, descontoProduto } = invoiceItems[0];
          const newAmount = preco + multa - descontoProduto;
          finalAmount = Number(newAmount) ? Number(newAmount) : finalAmount;
        }

        const amountToPay = Number(finalAmount.toFixed(2));

        // 4. Gera dueDate e referenceNumber
        const [dueDate, referenceNumber] = await Promise.all([
          generateDueDate(10),
          generateReferenceNumber(),
        ]);

        // 5. Payload para AppyPay (com valor já com possível multa)
        const payload = this.appyPayUtil.buildPayload({
          amount: amountToPay,
          currency: 'AOA',
          description,
          dueDate,
          referenceNumber,
        });

        // 6. Chamada ao AppyPay
        const appyResponse =
          await this.appyPayUtil.createPaymentReference(payload);
        const status = appyResponse?.responseStatus;

        if (!status?.successful || !status?.reference?.referenceNumber) {
          this.logger.error(
            'Falha ao gerar referência no AppyPay',
            appyResponse,
          );
          throw new BadGatewayException(
            'Falha ao gerar referência de pagamento via AppyPay.',
          );
        }

        // 7. Merchant Transaction ID
        const merchantTransactionId = await this.generateRandomCode();
        const paymentId = await this.generatePaymentId();

        // 8. Registro local
        const finalPayload: RegisterPaymentReferenceDto = {
          paymentId,
          facturaCodigo: invoice.Codigo,
          entityId: status?.reference?.entity || '10065',
          reference: referenceNumber,
          referenceId: appyResponse.id,
          merchantTransactionId,
          amount: amountToPay,
          startDate: new Date().toISOString(),
          endDate: new Date(dueDate).toISOString(),
          status: status?.status,
          webhook: 'https://api.seusistema.com/webhook/pagamento-be',
        };

        const registered = await this.registerPaymentReference(
          finalPayload,
          transactionalEntityManager,
        );

        // 9. Resposta clara
        const fineApplied = isMensalidade;

        return {
          message: fineApplied
            ? 'Referência renovada com sucesso '
            : 'Referência de pagamento renovada com sucesso',
          originalAmount: originalAmount.toFixed(2),
          finalAmount: amountToPay.toFixed(2),
          fineApplied,
          fineReason: fineApplied ? 'Mensalidade renovada após o dia 15' : null,
          newReferenceNumber: referenceNumber,
          newDueDate: dueDate,
          appyPayId: appyResponse.id,
          reference: registered,
        };
      },
    );
  }
  // ------------------------ NEWS ------------------------

  async queueCreatePaymentReferences(
    createPaymentReferenceDto: CreatePaymentReferenceDto,
  ) {
    const job = await this.paymentReferenceQueue.add(
      'createPaymentReferencesJob',
      {
        createPaymentReferenceDto,
      },
    );
    return {
      message: 'Processamento iniciado: criando fatura do serviço...',
      taskId: job.id,
    };
  }
  async queueUpdatePaymentReferences(invoiceId: number) {
    const job = await this.paymentReferenceQueue.add(
      'updatePaymentReferencesJob',
      {
        invoiceId,
      },
      {
        attempts: 5,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'Processamento iniciado: renovando referência de pagamento...',
      taskId: job.id,
      invoiceId,
    };
  }


  async getJobStatus(taskId: string) {
    const job = await this.paymentReferenceQueue.getJob(taskId);
    if (!job) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    const state = await job.getState();
    return {
      taskId: job.id,
      state,
      progress: job.progress,
      result: job.returnvalue,
    };
  }

  // payment-references.service.ts
  private async generateRandomCode(length: number = 15): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  private async generatePaymentId(length: number = 12): Promise<number> {
    const chars = '0123456789';
    let paymentId = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      paymentId += chars.charAt(randomIndex);
    }
    return Number(paymentId);
  }
}
