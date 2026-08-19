import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentReferencesService } from '../payment/payment-references/payment-references.service';
import { QueueName } from 'src/common/constants/queue.constant';
@Processor(QueueName.PAYMENT_REFERENCE_SERVICE)
export class CreatePaymentReferencesProcessor extends WorkerHost {
  constructor(
    // Inject the service where the logic lives
    private readonly paymentReferencesService: PaymentReferencesService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>) {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'createPaymentReferencesJob') {
      const { createPaymentReferenceDto } = job.data;

      await this.paymentReferencesService.create(createPaymentReferenceDto);
      console.log(`Job ${job.id} completed successfully.`);
      return { success: true };
    }
    if (job.name === 'updatePaymentReferencesJob') {
      const { invoiceId } = job.data;

      if (!invoiceId || isNaN(Number(invoiceId))) {
        throw new Error('invoiceId inválido');
      }

      await this.paymentReferencesService.renewPaymentReference(
        Number(invoiceId),
      );
      return { success: true };
    }

    console.log(`Job ${job.id} has an unknown type: ${job.name}`);
    return { success: false, message: 'Unknown job type' };
  }
  // Optional: Log completion
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} has completed!`);
  }
}
