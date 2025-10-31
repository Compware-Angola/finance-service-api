import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InvoiceService } from '../invoice/invoice.service';
@Processor('invoice_service')
export class InvoiceProcessor extends WorkerHost {
  constructor(
    private readonly invoiceService: InvoiceService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>) {
    console.log(`Processing job ${job.id} of type ${job.name}`);
   if (job.name === 'createInvoiceJob') {
      const { createInvoiceDto, referenceParams, dueDateParams } = job.data;

      await this.invoiceService.create(createInvoiceDto, referenceParams, dueDateParams);
      console.log(`Job ${job.id} completed successfully.`);
      return { success: true };
    }

    console.log(`Job ${job.id} has an unknown type: ${job.name}`);
    return { success: false, message: 'Unknown job type' };

  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} has completed!`);
  }
}