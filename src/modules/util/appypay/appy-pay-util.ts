import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  AppyPayChargeResponse,
  AppyPayPayload,
  AppyPayPayloadInput,
  AppyPayTokenResponse,
} from './appy-pay.types';

const DEFAULT_PAYMENT_METHOD = 'REF_65e88e95-9d71-4bbb-882a-412fb6a7e111';
const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000;

/**
 * Serviço utilitário para integração com o AppyPay.
 * Responsável por obter o token (com cache) e criar referências de pagamento.
 */
@Injectable()
export class AppyPayUtil {
  private readonly logger = new Logger(AppyPayUtil.name);

  private readonly authUrl: string;
  private readonly apiBaseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly resource: string;
  private readonly paymentMethod: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.authUrl = this.getRequiredConfig('APPYPAY_AUTH_URL');
    this.apiBaseUrl = this.getRequiredConfig('APPYPAY_API_BASE');
    this.clientId = this.getRequiredConfig('APPYPAY_CLIENT_ID');
    this.clientSecret = this.getRequiredConfig('APPYPAY_CLIENT_SECRET');
    this.resource = this.getRequiredConfig('APPYPAY_RESOURCE');
    this.paymentMethod =
      this.configService.get<string>('APPYPAY_PAYMENT_METHOD') ??
      DEFAULT_PAYMENT_METHOD;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(
        `Configuração AppyPay ausente: ${key} não está definida no ambiente.`,
      );
    }
    return value;
  }

  /**
   * 🔐 Obtém o token de autenticação do AppyPay.
   * Usa cache enquanto o token não estiver próximo de expirar.
   */
  public async getAppyPayToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        resource: this.resource,
      });

      const { data, status } = await axios.post<AppyPayTokenResponse>(
        this.authUrl,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      if (status !== 200 || !data?.access_token) {
        throw new BadGatewayException(
          `Erro ao obter token AppyPay: ${JSON.stringify(data)}`,
        );
      }

      this.cachedToken = data.access_token;
      const expiresInMs = (data.expires_in ?? 0) * 1000;
      this.tokenExpiresAt = Date.now() + expiresInMs - TOKEN_EXPIRY_MARGIN_MS;

      return this.cachedToken;
    } catch (error) {
      this.cachedToken = null;
      throw this.toBadGateway(error, 'Falha ao obter token AppyPay');
    }
  }

  /**
   * 🚀 Cria uma referência de pagamento na API AppyPay.
   */
  public async createPaymentReference(
    payload: AppyPayPayload,
  ): Promise<AppyPayChargeResponse> {
    try {
      const token = await this.getAppyPayToken();

      const { data, status } = await axios.post<AppyPayChargeResponse>(
        `${this.apiBaseUrl}/charges`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (status >= 400) {
        throw new BadGatewayException(
          `Erro ao criar referência: ${JSON.stringify(data)}`,
        );
      }

      return data;
    } catch (error) {
      throw this.toBadGateway(error, 'Falha ao criar referência de pagamento');
    }
  }

  /**
   * 🧩 Monta o payload final para criação da referência AppyPay.
   */
  public buildPayload(input: AppyPayPayloadInput): AppyPayPayload {
    const payload: AppyPayPayload = {
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      paymentMethod: this.paymentMethod,
      paymentInfo: {
        dueDate: input.dueDate,
        referenceNumber: input.referenceNumber,
      },
      merchantTransactionId: input.referenceNumber,
    };

    if (input.notify) {
      payload.notify = {
        name: input.notify.name,
        telephone: input.notify.telephone,
        email: input.notify.email,
        smsNotification: input.notify.smsNotification ?? true,
        emailNotification: input.notify.emailNotification ?? true,
      };
    }

    return payload;
  }

  /**
   * Converte qualquer erro em BadGatewayException, preservando exceções já tratadas.
   */
  private toBadGateway(
    error: unknown,
    fallbackMessage: string,
  ): BadGatewayException {
    if (error instanceof BadGatewayException) {
      return error;
    }

    if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
      const axiosError = error as AxiosError<{
        message?: string;
        error?: string;
      }>;
      const details =
        axiosError.response?.data?.message ??
        axiosError.response?.data?.error ??
        axiosError.message;

      this.logger.error(
        `${fallbackMessage}: status=${axiosError.response?.status ?? 'N/A'} | ${details}`,
      );

      return new BadGatewayException(`${fallbackMessage}: ${details}`);
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${fallbackMessage}: ${message}`);
    return new BadGatewayException(`${fallbackMessage}: ${message}`);
  }
}
