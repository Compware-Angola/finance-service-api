import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { AppyPayWebhookDto } from './dto/appypay-webhook.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * 🔔 Recebe notificações do AppyPay
   * Exemplo de endpoint: POST /api/webhook/appypay
   */
  @Post('appypay')
  @HttpCode(HttpStatus.OK)
  async handleAppyPayWebhook(
    @Body() payload: AppyPayWebhookDto,
    @Headers('x-signature') signature?: string,
    @Req() req?: Request,
  ) {
    return this.webhookService.processAppyPayEvent(payload, signature);
  }
}


/*  Exemplo de payload recebido do AppyPay:
{
  id: 57d78ab6-4acd-4ce7-9ba8-47d2922865e3,
  status: Paid,
  responseStatus: {
    successful: true,
    status: Pending,    

    code: 101,
    message: A solicitação foi aceita para processamento.,
    reference: {
      referenceNumber: 401392944,
      entity: 10065
    }
  },
  reference: {
    referenceNumber: 401392944,
    dueDate: 2025-10-30T00:00:00,
    entity: 10065
  }
}
*/
/* Exemplo de como chamar o meu webhooks

  curl -X POST http://localhost:3002/api/webhook/appypay -H Content-Type: application/json -d '{reference: {referenceNumber: 721503134}, status: Paid}'


*/