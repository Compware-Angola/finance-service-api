import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PaymentMethod } from "./enums/cash-register-status.enum";

@Injectable()
export class PaymentAnalyticsService {
    constructor(private readonly dataSource: DataSource) { }

    async getDailySummary(params: {
        operatorId: number;
        cashRegisterId: number;
        date: Date;
    }) {
        const start = new Date(params.date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(params.date);
        end.setHours(23, 59, 59, 999);

        const result = await this.dataSource.query(
            `
      SELECT
        SUM(CASE WHEN p.FORMA_PAGAMENTO = ${PaymentMethod.CASH}
                 THEN p.VALOR_DEPOSITADO ELSE 0 END) AS total_cash,

        SUM(CASE WHEN p.FORMA_PAGAMENTO = ${PaymentMethod.CARD}
                 THEN p.VALOR_DEPOSITADO ELSE 0 END) AS total_card

      FROM FK2_TB_PAGAMENTOS p
      WHERE p.FK_UTILIZADOR = :1
        AND p.CAIXA_ID = :2
        AND p.STATUS_PAGAMENTO = 'concluido'
        AND p.CREATED_AT BETWEEN :3 AND :4
      `,
            [params.operatorId, params.cashRegisterId, start, end],
        );

        return {
            cash: Number(result[0]?.TOTAL_CASH || 0),
            card: Number(result[0]?.TOTAL_CARD || 0),
        };
    }
}