import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { CreatePaymentReferencesProcessor } from './module/jobs/create-payment-references.processor';
import { InvoiceProcessor } from './module/jobs/invoice-servico.processor';

@Injectable()
export class BullMQWorkerService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(BullMQWorkerService.name);
  private workers: Worker[] = [];
  private queueEvents: QueueEvents[] = [];
  private connection!: Redis;
  constructor(
    private readonly paymentProcessor: CreatePaymentReferencesProcessor,
    private readonly invoiceProcessor: InvoiceProcessor,
  ) {}

  async onModuleInit() {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      reconnectOnError: (err) => {
        const target = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];
        return target.some((e) => err.message.includes(e));
      },
    });

    this.connection.on('error', (err) => {
      this.logger.error('🔥 Redis CONEXÃO PERDIDA!', err.message);
    });

    this.connection.on('connect', () => {
      this.logger.log('Redis conectado com sucesso ✅');
    });

    const queues = [
      { name: 'payment_reference_service', processor: this.paymentProcessor },
      { name: 'invoice_service', processor: this.invoiceProcessor },
    ];

    for (const { name, processor } of queues) {
      await this.startQueue(name, processor);
    }
  }

  private async startQueue(queueName: string, processor: any) {
    const events = new QueueEvents(queueName, { connection: this.connection });
    events.on('error', (err) => {
      this.logger.error(`QueueEvents ERRO [${queueName}]:`, err.message);
    });
    this.queueEvents.push(events);

    const worker = new Worker(
      queueName,
      async (job) => processor.process(job),
      {
        connection: this.connection,
        concurrency: 5,
        removeOnComplete: { count: 1000, age: 3600 },
        removeOnFail: { count: 100, age: 86400 },
        stalledInterval: 30000,
        maxStalledCount: 3,
        lockDuration: 120000,
        lockRenewTime: 30000,
      },
    );

    worker.on('completed', (job) => {
      this.logger.log(`✅ Job ${job.id} [${queueName}] concluído`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `🚨 Job ${job?.id} [${queueName}] FALHOU: ${err.message}`,
      );
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        this.logger.error(`💀 JOB MORTO: ${job.id}`);
      }
    });

    worker.on('stalled', (jobId) => {
      this.logger.warn(`⚠️ Job ${jobId} STALLED`);
    });

    this.workers.push(worker);
    this.logger.log(`Worker iniciado: ${queueName} 🚀`);
  }

  async onModuleDestroy() {
    await this.shutdown('onModuleDestroy');
  }

  async onApplicationShutdown() {
    await this.shutdown('onApplicationShutdown');
  }

  private async shutdown(caller: string) {
    this.logger.warn(`Shutdown (${caller})...`);
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all(this.queueEvents.map((e) => e.close()));
    await this.connection.disconnect();
    this.logger.log('Tudo fechado 🛑');
  }
}
