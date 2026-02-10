import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class MonthlyFeePenaltyCronTest {
  private readonly logger = new Logger(MonthlyFeePenaltyCronTest.name);

  constructor(private readonly dataSource: DataSource) {}

 // @Cron('*/10 * * * * *') // a cada 10 segundos para teste
 @Cron('30 1 * * *')   // descomenta para produção
  async applyProgressiveLateFees() {
    this.logger.log('⚠️ MODO TESTE - Aplicação de multas progressivas (máx 2 por nível)');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const updatedFacturas = new Set<string>();

      // ==================================================
      // 1. Aplicar 5% — 
      // ==================================================
      await qr.query(`
        UPDATE FK2_FACTURA_ITEMS fi
        SET 
          fi.MULTA = ROUND((fi.PRECO * fi.QUANTIDADE) * 0.05, 2)
        WHERE fi.ESTADO = 0
          AND (fi.MULTA IS NULL OR fi.MULTA = 0)
          AND EXISTS (
            SELECT 1 
            FROM FK2_FACTURA f
            JOIN FK2_MES_TEMP mt ON fi.MES_TEMP_ID = mt.ID
            WHERE f.CODIGO = fi.CODIGOFACTURA
             AND f.ANO_LECTIVO = 23
              AND mt.ANO_LECTIVO=23
              AND f.ESTADO = 0
              AND TRUNC(SYSDATE) >= TRUNC(mt.DATA_LIMITE)
              AND TRUNC(SYSDATE) <= TRUNC(mt.DATA_FINAL)
          )
          AND ROWNUM <= 2
      `);

      const res5 = await qr.query(`
        SELECT DISTINCT CODIGOFACTURA
        FROM FK2_FACTURA_ITEMS
        WHERE ROUND((MULTA / (PRECO * QUANTIDADE)), 2) = 0.05
          AND MULTA IS NOT NULL
          AND (PRECO * QUANTIDADE) > 0   -- ← PROTEÇÃO contra divisão por zero
          AND ESTADO = 0
      `);

      const facturas5 = res5.map((row: any) => row.CODIGOFACTURA);
      facturas5.forEach(id => updatedFacturas.add(id));
      this.logger.log(`[5%] Atualizados ${facturas5.length} itens → Facturas: ${facturas5.join(', ') || 'nenhuma'}`);

      // ==================================================
      // 2. Aplicar 7% —
      // ==================================================
      await qr.query(`
        UPDATE FK2_FACTURA_ITEMS fi
        SET 
          fi.MULTA = ROUND((fi.PRECO * fi.QUANTIDADE) * 0.07, 2)
        WHERE fi.ESTADO = 0
          AND fi.MULTA > 0 
          AND ROUND((fi.MULTA / (fi.PRECO * fi.QUANTIDADE)) * 100, 2) = 5
          AND EXISTS (
            SELECT 1 
            FROM FK2_FACTURA f
            JOIN FK2_MES_TEMP mt ON fi.MES_TEMP_ID = mt.ID
            WHERE f.CODIGO = fi.CODIGOFACTURA
              AND f.ANO_LECTIVO = 23
              AND mt.ANO_LECTIVO=23
              AND f.ESTADO = 0
              AND TRUNC(SYSDATE) > TRUNC(mt.DATA_FINAL)
              AND TRUNC(SYSDATE) <= ADD_MONTHS(TRUNC(mt.DATA_FINAL), 1)
          )
          AND ROWNUM <= 2
      `);

      const res7 = await qr.query(`
        SELECT DISTINCT CODIGOFACTURA
        FROM FK2_FACTURA_ITEMS
        WHERE ROUND((MULTA / (PRECO * QUANTIDADE)), 2) = 0.07
          AND MULTA IS NOT NULL
          AND (PRECO * QUANTIDADE) > 0   -- ← PROTEÇÃO contra divisão por zero
          AND ESTADO = 0
      `);

      const facturas7 = res7.map((row: any) => row.CODIGOFACTURA);
      facturas7.forEach(id => updatedFacturas.add(id));
      this.logger.log(`[7%] Atualizados ${facturas7.length} itens → Facturas: ${facturas7.join(', ') || 'nenhuma'}`);

      // ==================================================
      // 3. Aplicar 10% — max 2 registos
      // ==================================================
      await qr.query(`
        UPDATE FK2_FACTURA_ITEMS fi
        SET 
          fi.MULTA = ROUND((fi.PRECO * fi.QUANTIDADE) * 0.10, 2)
        WHERE fi.ESTADO = 0
          AND fi.MULTA > 0
          AND ROUND((fi.MULTA / (fi.PRECO * fi.QUANTIDADE)) * 100, 2) IN (5, 7)
          AND EXISTS (
            SELECT 1 
            FROM FK2_FACTURA f
            JOIN FK2_MES_TEMP mt ON fi.MES_TEMP_ID = mt.ID
            WHERE f.CODIGO = fi.CODIGOFACTURA
             AND f.ANO_LECTIVO = 23
              AND mt.ANO_LECTIVO=23
              AND f.ESTADO = 0
              AND TRUNC(SYSDATE) > ADD_MONTHS(TRUNC(mt.DATA_FINAL), 1)
          )
          AND ROWNUM <= 2
      `);

      const res10 = await qr.query(`
        SELECT DISTINCT CODIGOFACTURA
        FROM FK2_FACTURA_ITEMS
        WHERE ROUND((MULTA / (PRECO * QUANTIDADE)), 2) = 0.10
          AND MULTA IS NOT NULL
          AND (PRECO * QUANTIDADE) > 0   -- ← PROTEÇÃO contra divisão por zero
          AND ESTADO = 0
      `);

      const facturas10 = res10.map((row: any) => row.CODIGOFACTURA);
      facturas10.forEach(id => updatedFacturas.add(id));
      this.logger.log(`[10%] Atualizados ${facturas10.length} itens → Facturas: ${facturas10.join(', ') || 'nenhuma'}`);

      // ==================================================
      // 4. Recalcular totais apenas das facturas afetadas
      // ==================================================
      if (updatedFacturas.size > 0) {
        const codigos = Array.from(updatedFacturas)
          .map(c => `'${c.replace(/'/g, "''")}'`) 
          .join(',');

        await qr.query(`
          UPDATE FK2_FACTURA f
          SET 
            f.TOTALMULTA = (
              SELECT NVL(SUM(fi.MULTA), 0)
              FROM FK2_FACTURA_ITEMS fi
              WHERE fi.CODIGOFACTURA = f.CODIGO
                AND fi.ESTADO = 0
            ),
            f.VALORAPAGAR = (
              SELECT NVL(SUM(
                (fi.PRECO * fi.QUANTIDADE) 
                + NVL(fi.MULTA, 0) 
                + NVL(fi.VALOR_IVA, 0) 
                - NVL(fi.VALOR_DESCONTO, 0)
                - NVL(fi.RETENCAO, 0)
              ), 0)
              FROM FK2_FACTURA_ITEMS fi
              WHERE fi.CODIGOFACTURA = f.CODIGO
                AND fi.ESTADO = 0
            ),
            f.UPDATED_AT = SYSDATE
          WHERE f.CODIGO IN (${codigos})
        `);

        this.logger.log(`Totais recalculados para ${updatedFacturas.size} factura(s): ${Array.from(updatedFacturas).join(', ')}`);
      } else {
        this.logger.log('Nenhuma factura foi alterada nesta execução.');
      }

      await qr.commitTransaction();
      this.logger.log('Execução de teste concluída com sucesso.');

    } catch (error) {
      await qr.rollbackTransaction();
      this.logger.error('Erro no teste de aplicação de multas', error);
      this.logger.error(error.stack || error.message);
    } finally {
      await qr.release();
    }
  }
}