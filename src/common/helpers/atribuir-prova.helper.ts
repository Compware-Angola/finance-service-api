import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

interface AtribuirProvaPayload {
  codigoCandidato: number;
}

export class AtribuirProvaHelper {
  private static readonly logger = new Logger(AtribuirProvaHelper.name);

  private static getUrl(codigoCandidato: number): string {
    const baseUrl = process.env.API_BASE_URL_GATSBY || 'http://localhost:3000/api';

    return `${baseUrl}/exames-de-acesso/atribuir-prova/${codigoCandidato}`;
  }

  /**
   * Fire-and-forget (recomendado)
   */
  static atribuirProva(
    httpService: HttpService,
    payload: AtribuirProvaPayload,
  ): void {
    const url = this.getUrl(payload.codigoCandidato);
    console.log(url);


    httpService
      .post(url, {}, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 4000,
      })
      .subscribe({
        next: () => {
          this.logger.debug(
            `Prova atribuída com sucesso para candidato: ${payload.codigoCandidato}`,
          );
        },
        error: (err) => {
          this.logger.warn('Falha ao atribuir prova', {
            error: err.message,
            status: err.response?.status,
            responseData: err.response?.data,
            codigoCandidato: payload.codigoCandidato,
            url,
          });
        },
      });
  }

  /**
   * Versão síncrona — aguarda resposta e retorna dados
   */
  static async atribuirProvaSync(
    httpService: HttpService,
    payload: AtribuirProvaPayload,
  ): Promise<any> {
    const url = this.getUrl(payload.codigoCandidato);
    console.log(url);


    try {
      const { lastValueFrom } = await import('rxjs');
      const response = await lastValueFrom(
        httpService.post(url, {}, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }),
      );

      this.logger.debug(
        `Prova atribuída (sync) com sucesso para candidato: ${payload.codigoCandidato}`,
      );

      return response.data;
    } catch (err) {
      this.logger.error(
        `Falha ao atribuir prova (sync) para candidato ${payload.codigoCandidato}`,
        {
          error: err.message,
          status: err.response?.status,
          responseData: err.response?.data,
          url,
        },
      );
      throw err;
    }
  }
}