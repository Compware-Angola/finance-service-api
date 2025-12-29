import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class PaymentExpirationCron {
  private readonly logger = new Logger(PaymentExpirationCron.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Executa todos os dias à 00:00
   * 
   * Expira referências de pagamento que estão pendentes e cuja data de término já passou.
   */
  @Cron('0 0 * * *')
  async expirePendingReferences() {
    this.logger.log('⏳ Início da verificação de referências expiradas');

    const sql = `
      UPDATE FK2_PAGAMENTO_POR_REFERENCIAS
      SET
        STATUS_ = 'Expired',
        UPDATED_AT = SYSDATE
      WHERE
        STATUS_ = 'Pending'
        AND END_DATE IS NOT NULL
        AND END_DATE < TRUNC(SYSDATE)
    `;

    try {
      const result = await this.dataSource.query(sql);

      this.logger.log('✅ Verificação concluída com sucesso');
      this.logger.log(`🔁 Referências expiradas atualizadas`);
    } catch (error) {
      this.logger.error('❌ Erro ao expirar referências de pagamento', error);
    }
  }
}
