import { BadGatewayException } from '@nestjs/common'
import axios from 'axios'

/**
 * Classe utilitária para integração com o AppyPay.
 * Responsável por obter o token e criar referências de pagamento.
 */
export class AppyPayUtil {
  private authUrl: string
  private apiBaseUrl: string
  private clientId: string
  private clientSecret: string
  private resource: string

  constructor() {
    this.authUrl = process.env.APPYPAY_AUTH_URL as string
    this.apiBaseUrl = process.env.APPYPAY_API_BASE as string
    this.clientId = process.env.APPYPAY_CLIENT_ID as string
    this.clientSecret = process.env.APPYPAY_CLIENT_SECRET as string
    this.resource = process.env.APPYPAY_RESOURCE as string
  }

  /**
   * 🔐 Obtém o token de autenticação do AppyPay.
   */
  public async getAppyPayToken(): Promise<{ access_token: string; expires_in: number }> {
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        resource: this.resource,
      })

      const response = await axios.post(this.authUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      if (response.status !== 200) {
        throw new BadGatewayException(`Erro ao obter token AppyPay: ${response.data}`)
      }

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      }
    } catch (error: any) {
      throw new BadGatewayException(`Falha ao obter token AppyPay: ${error.message}`)
    }
  }

  /**
   * 🚀 Cria uma referência de pagamento na API AppyPay.
   */
   public async createPaymentReference(payload: Record<string, any>): Promise<Record<string, any>> {
    try {
      const tokenResponse = await this.getAppyPayToken()
      const token = tokenResponse.access_token

      const url = `${this.apiBaseUrl}/charges`

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status >= 400) {
        throw new BadGatewayException(`Erro ao criar referência: ${response.data}`)
      }

      return response.data
    } catch (error: any) {
      console.log(error);
      
      throw new BadGatewayException(`Falha ao criar referência de pagamento: ${error.message}`)
    }
  }
}
