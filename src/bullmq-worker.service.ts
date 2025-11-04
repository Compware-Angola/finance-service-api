// src/bullmq-worker.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { CreatePaymentReferencesProcessor } from './module/jobs/create-payment-references.processor';
import { WorkerHost } from '@nestjs/bullmq';
import { InvoiceProcessor } from './module/jobs/invoice-servico.processor';

@Injectable()
export class BullMQWorkerService implements OnModuleInit {
  private readonly logger = new Logger(BullMQWorkerService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly paymentProcessor: CreatePaymentReferencesProcessor,
    private readonly invoiceProcessor: InvoiceProcessor,
  ) {}

  onModuleInit() {
    this.startWorker('payment_reference_service', this.paymentProcessor);
    this.startWorker('invoice_service', this.invoiceProcessor);
  }

  private startWorker(queueName: string, processor: WorkerHost) {
    const worker = new Worker(
      queueName,
      async (job) => processor.process(job),
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
        },
      },
    );

    worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} (${queueName}) concluído`);
    });

    worker.on('failed', (job:any, err) => {
      this.logger.error(`Job ${job.id} (${queueName}) falhou: ${err.message}`);
    });

    this.workers.push(worker);
    this.logger.log(`Worker iniciado: ${queueName}`);
  }
}