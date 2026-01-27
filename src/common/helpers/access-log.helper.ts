
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
private static readonly BASE_URL = process.env.API_BASE_URL_ACESS_LOGS ?? 'http://localhost:3000/api';
  private static readonly LOG_ENDPOINT = '/acess_management/create-logs';
  private static readonly LOG_URL = `${AccessLogHelper.BASE_URL}${AccessLogHelper.LOG_ENDPOINT}`;

  /**
   * Envia um log de acesso de forma assíncrona (fire-and-forget)
   * @param httpService Instância injetada do HttpService
   * @param payload Dados do log
   */
  static async logAccess(httpService: HttpService, payload: AccessLogPayload): Promise<void> {
   
     
    const finalPayload: AccessLogPayload = {
      descricao: payload.descricao,
      fkAcesso: payload.fkAcesso ?? 0,
      fkFuncionalidade: payload.fkFuncionalidade ?? 15,
      fkUtilizadorResponsavel: payload.fkUtilizadorResponsavel ?? undefined,
      fkGrupoAfetado: payload.fkGrupoAfetado ?? 78,
      fkOperacaoLog: payload.fkOperacaoLog ?? 4,
      ip: payload.ip ?? 'unknown',
    };

    try {
    
      
      httpService
        .post(this.LOG_URL, finalPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 4000, // evita travar muito tempo se o endpoint estiver lento
        })
        .subscribe({
          next: () => {
            // sucesso silencioso (opcional: pode logar em debug)
             this.logger.debug(`Log de acesso enviado: ${finalPayload.descricao}`);
          },
          error: (err) => {
           
          this.logger.warn('Falha ao enviar log de acesso', {
    error: err.message,
    status: err.response?.status,
    responseData: err.response?.data,        
    descricao: finalPayload.descricao,
  });
          },
        });
    } catch (err) {
      this.logger.error('Erro crítico ao preparar envio de log', err);
    }
  }

  /**
   * Versão síncrona (com await) – use só se realmente precisar esperar a resposta
   */
  static async logAccessSync(httpService: HttpService, payload: AccessLogPayload): Promise<void> {
    const finalPayload = { ...payload }; 

    try {
      await lastValueFrom(
        httpService.post(this.LOG_URL, finalPayload, {
          timeout: 5000,
        }),
      );
    } catch (err) {
      this.logger.error('Falha ao enviar log (modo sync)', err);
    }
  }
}