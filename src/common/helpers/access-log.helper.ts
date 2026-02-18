import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

interface AccessLogPayload {
  descricao: string;
  fkAcesso?: number;
  fkFuncionalidade?: number;
  fkUtilizadorResponsavel?: number;
  fkGrupoAfetado?: number;
  fkOperacaoLog?: number;
  ip?: string;
}

export class AccessLogHelper {
  private static readonly logger = new Logger(AccessLogHelper.name);

  private static getLogUrl(): string {
    const baseUrl =
      process.env.API_BASE_URL_ACESS_LOGS || 'http://localhost:3000/api';

    return `${baseUrl}/acess_management/create-logs`;
  }

  /**
   * Fire-and-forget (recomendado)
   */
  static logAccess(httpService: HttpService, payload: AccessLogPayload): void {
    const finalPayload: AccessLogPayload = {
      descricao: payload.descricao,
      fkAcesso: payload.fkAcesso ?? 0,
      fkFuncionalidade: payload.fkFuncionalidade ?? 15,
      fkUtilizadorResponsavel: payload.fkUtilizadorResponsavel,
      fkGrupoAfetado: payload.fkGrupoAfetado ?? 78,
      fkOperacaoLog: payload.fkOperacaoLog ?? 4,
      ip: payload.ip ?? 'unknown',
    };

    const logUrl = this.getLogUrl();

    httpService
      .post(logUrl, finalPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 4000,
      })
      .subscribe({
        next: () => {
          this.logger.debug(
            `Log enviado com sucesso: ${finalPayload.descricao}`,
          );
        },
        error: (err) => {
          this.logger.warn('Falha ao enviar log de acesso', {
            error: err.message,
            status: err.response?.status,
            responseData: err.response?.data,
            descricao: finalPayload.descricao,
            url: logUrl,
          });
        },
      });
  }

  /**
   * Versão síncrona (evitar em produção)
   */
  static async logAccessSync(
    httpService: HttpService,
    payload: AccessLogPayload,
  ): Promise<void> {
    try {
      await lastValueFrom(
        httpService.post(this.getLogUrl(), payload, {
          timeout: 5000,
        }),
      );
    } catch (err) {
      this.logger.error('Falha ao enviar log (sync)', err);
    }
  }
}
