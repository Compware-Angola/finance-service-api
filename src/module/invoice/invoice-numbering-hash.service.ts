import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import * as NodeRSA from 'node-rsa';
import { Invoice } from './entities/invoice.entity';
import { CompanyKey } from 'src/common/config/security/key-company';
import { genearateKeyNumber } from '../util/generate-key-number';
import { generateDueDate } from '../util/generate-due-date';

// Interfaces
interface FacturaAnterior {
  i_DataFactura: string | Date;
  i_hashValor: string;
  i_numSequenciaFactura: number;
}

interface InvoiceHashData {
  hashValor: string;
  plaintext: string;
  numeracaoFactura: string;
  numSequenciaFactura: number;
}

@Injectable()
export class InvoiceNumberingAndHashService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly key: CompanyKey,
  ) {}

  async generateInvoiceHashData(
    totalPreco: number,
    tipo_factura_id: number,
    ano_id: number,
    polo_id: number,
    tipo_factura_sigla: string,
    ano_designacao: string
  ): Promise<InvoiceHashData> {
    try {
      // Validação
      if (isNaN(totalPreco) || totalPreco < 0) {
        throw new BadRequestException('O valor totalPreco fornecido é inválido.');
      }


      // Converte ano_id para string (pois coluna é VARCHAR2)
   const anoStr = ano_id.toString().trim();
    const poloStr = polo_id.toString().trim();
    const tipoStr = tipo_factura_id.toString().trim();
    
      // Query com TO_NUMBER seguro + NVL para lidar com NULLs
      const ultimaFaturaResults = await this.invoiceRepository
        .createQueryBuilder('i')
        .select([
          'i.DataFactura',
          'i.hashValor',
          'i.numSequenciaFactura',
        ])
        .where(
          `i.tipoDocumentoFacturaId = :tipo 
           AND NVL(i.ano_lectivo, '0') = :ano 
           AND i.poloId = :polo`,
          {
         tipo: tipoStr, 
          ano: anoStr, 
          polo: poloStr
          }
        )
       .orderBy(`CAST(TRIM(i.numSequenciaFactura) AS NUMBER)`, 'DESC') 
        .limit(1)
        .getRawOne() as FacturaAnterior | undefined;

  
      const ultimaFatura = ultimaFaturaResults;

      const data_factura = ultimaFatura?.i_DataFactura
        ? DateTime.fromJSDate(new Date(ultimaFatura.i_DataFactura))
        : DateTime.now();

      const hashAnterior = ultimaFatura?.i_hashValor ?? '0';
      const datactual = DateTime.now();
      const diff = datactual.diff(data_factura, 'years').years;

      const numSequenciaFactura =
        diff < 1 && ultimaFatura?.i_numSequenciaFactura != null
          ? ultimaFatura.i_numSequenciaFactura + 1
          : 1;

      const numeracaoFactura = `${tipo_factura_sigla} UMA ${ano_designacao}/${numSequenciaFactura}`;

      const privateKeyString = await this.key.getPrivateKey();
      const rsa = new NodeRSA(privateKeyString, 'pkcs8-private-pem');
      rsa.setOptions({ signingScheme: 'pkcs1-sha256' });

      const dateOnly = datactual.toFormat('yyyy-MM-dd');
      const dateTimeT = datactual.toFormat("yyyy-MM-dd'T'HH:mm:ss");
      const totalFormatted = totalPreco.toFixed(2);

      const plaintext = `${dateOnly};${dateTimeT};${numeracaoFactura};${totalFormatted};${hashAnterior}`;
      const signature = rsa.sign(Buffer.from(plaintext), 'base64', 'utf8');

      return {
        hashValor: signature,
        plaintext,
        numeracaoFactura,
        numSequenciaFactura,
      };
    } catch (error) {
      console.error('Erro ao gerar hash e sequência da fatura:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Falha na geração da assinatura digital ou sequenciamento.');
    }
  }
}