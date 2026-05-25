/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import * as FormData from 'form-data';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: string;
  attachments?: Buffer | string;
}

export class EmailHelper {
  private static readonly logger = new Logger(EmailHelper.name);

  private static getEmailUrl(): string {
    return process.env.MAIL_API_URL!;
  }

  static sendEmail(httpService: HttpService, payload: SendEmailPayload): void {
    const formData = this.buildFormData(payload);

    httpService
      .post(this.getEmailUrl(), formData, {
        headers: {
          ...formData.getHeaders(),
          accept: '*/*',
        },
        timeout: 10000,
      })
      .subscribe({
        next: () => {
          this.logger.log(`Email enviado para ${payload.to}`);
        },
        error: (err) => {
          this.logger.error('Erro ao enviar email', {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          });
        },
      });
  }

  static async sendEmailSync(
    httpService: HttpService,
    payload: SendEmailPayload,
  ): Promise<void> {
    try {
      const formData = this.buildFormData(payload);

      await lastValueFrom(
        httpService.post(this.getEmailUrl(), formData, {
          headers: {
            ...formData.getHeaders(),
            accept: '*/*',
          },
          timeout: 10000,
        }),
      );

      this.logger.log(`Email enviado para ${payload.to}`);
    } catch (err) {
      this.logger.error('Erro ao enviar email sync', {
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

    if (payload.html) {
      formData.append('html', payload.html);
    }

    if (payload.text) {
      formData.append('text', payload.text);
    }

    if (payload.template) {
      formData.append('template', payload.template);
    }

    if (payload.context) {
      formData.append('context', payload.context);
    }

    if (payload.attachments) {
      formData.append('attachments', payload.attachments);
    }

    return formData;
  }
}
