import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

interface GenerateHashResponse {
  hash: string;
}

interface VerifyHashResponse {
  valid: boolean;
}

export class HashHelper {
  private static readonly logger = new Logger(HashHelper.name);

  private static getHashServiceUrl(): string {
    return process.env.HASH_SERVICE_URL || 'http://127.0.0.1:3003/api';
  }

  private static getTimeout(): number {
    return parseInt(process.env.HASH_SERVICE_TIMEOUT || '10000', 10);
  }

  static async generateHash(
    httpService: HttpService,
    texto: string,
  ): Promise<string> {
    try {
      const url = `${this.getHashServiceUrl()}/hash`;
      const response = await lastValueFrom(
        httpService.post<GenerateHashResponse>(
          url,
          { texto },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: this.getTimeout(),
          },
        ),
      );
      return response.data.hash;
    } catch (err) {
      this.logger.error('Falha ao gerar hash', err);
      throw new Error(`Erro ao gerar hash: ${err.message}`);
    }
  }

  static async verifyHash(
    httpService: HttpService,
    texto: string,
    hash: string,
  ): Promise<boolean> {
    try {
      const url = `${this.getHashServiceUrl()}/verify`;
      const response = await lastValueFrom(
        httpService.post<VerifyHashResponse>(
          url,
          { texto, hash },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: this.getTimeout(),
          },
        ),
      );
      return response.data.valid;
    } catch (err) {
      this.logger.error('Falha ao verificar hash', err);
      throw new Error(`Erro ao verificar hash: ${err.message}`);
    }
  }
}
