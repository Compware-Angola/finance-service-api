import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import * as FormData from 'form-data';

export interface SendEmailPayload {
  to: string;
  subject: string;
  company: string;
  type: string;

  // agora o foco é template
  template?: string;
  context?: Record<string, any>;

  // fallback opcional
  html?: string;
  text?: string;

  attachments?: Buffer | string;
}

export class EmailHelper {
  private static readonly logger = new Logger(EmailHelper.name);

  private static getEmailUrl(): string {
    return process.env.MAIL_API_URL!;
  }

  static async sendEmail(
    httpService: HttpService,
    payload: SendEmailPayload,
  ): Promise<void> {
    try {
      const formData = this.buildFormData(payload);

      await lastValueFrom(
        httpService.post(`${this.getEmailUrl()}/send-email`, formData, {
          headers: {
            ...formData.getHeaders(),
            accept: '*/*',
          },
          timeout: 10000,
        }),
      );

      this.logger.log(`Email enviado para ${payload.to}`);
    } catch (err: any) {
      this.logger.error('Erro ao enviar email', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
    }
  }

  private static buildFormData(payload: SendEmailPayload): FormData {
    const formData = new FormData();

    formData.append('to', payload.to);
    formData.append('subject', payload.subject);
    formData.append('company', payload.company);
    formData.append('type', payload.type);

    // prioridade: template
    if (payload.template) {
      formData.append('template', payload.template);
    }

    // contexto sempre em JSON string
    if (payload.context) {
      formData.append('context', JSON.stringify(payload.context));
    }

    // fallback manual
    if (payload.html) {
      formData.append('html', payload.html);
    }

    if (payload.text) {
      formData.append('text', payload.text);
    }

    if (payload.attachments) {
      formData.append('attachments', payload.attachments);
    }

    return formData;
  }
}
