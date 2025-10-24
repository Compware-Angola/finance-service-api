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
    DataFactura: string | Date;
    hashValor: string;
    numSequenciaFactura: number;
}

interface InvoiceHashData {
    hashValor: string;
    plaintext: string;
    numeracaoFactura: string;
    referencia: string;
    numSequenciaFactura: number;
    dataVencimento?: string;
}

@Injectable()
export class InvoiceNumberingAndHashService {
    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        private readonly key: CompanyKey,
    ) { }

    async generateInvoiceHashData(
        totalPreco: number,
        tipo_factura_id: number,
        ano_id: number,
        polo_id: number,
        tipo_factura_sigla: string,
        ano_designacao: string
    ): Promise<InvoiceHashData> {
        try {
            if (isNaN(totalPreco) || totalPreco < 0) {
                throw new BadRequestException('O valor totalPreco fornecido é inválido.');
            }

            const reference_key = await genearateKeyNumber(9);
            const dueDate = await generateDueDate(10)

 const ultimaFaturaResults = await this.invoiceRepository.find({
  where: {
    tipoDocumentoFacturaId: tipo_factura_id as any,
    anoLectivo: ano_id as any,
    poloId: polo_id as any,
  },
  order: { numSequenciaFactura: 'DESC' },
  take: 1,
  select: ['DataFactura', 'hashValor', 'numSequenciaFactura'],
}) as FacturaAnterior[];

            const ultimaFatura = ultimaFaturaResults.length ? ultimaFaturaResults[0] : null;
            const data_factura = ultimaFatura?.DataFactura
                ? DateTime.fromJSDate(new Date(ultimaFatura.DataFactura))
                : DateTime.now();

        
            const hashAnterior = ultimaFatura?.hashValor ?? '0';
            const datactual = DateTime.now();

            const diff = datactual.diff(data_factura, 'years').years;

     

const numSequenciaFactura =
  diff < 1 && ultimaFatura?.numSequenciaFactura != null
    ? ultimaFatura.numSequenciaFactura + 1
    : 1;


            const numeracaoFactura = `${tipo_factura_sigla} UMA ${ano_designacao}/${numSequenciaFactura}`;


            const privateKeyString = await this.key.getPrivateKey();



            // 🔹 Cria um objeto RSA a partir da chave
            const rsa = new NodeRSA(privateKeyString, 'pkcs8-private-pem');
            rsa.setOptions({ signingScheme: 'pkcs1-sha256' });

            // 🔹 7. Texto a assinar
            const dateOnly = datactual.toFormat('yyyy-MM-dd');
            const dateTimeT = datactual.toFormat("yyyy-MM-dd'T'HH:mm:ss");
            const totalFormatted = totalPreco.toFixed(2);
            const plaintext = `${dateOnly};${dateTimeT};${numeracaoFactura};${totalFormatted};${hashAnterior}`;


            // 🔹 Gera assinatura em Base64
            const signature = rsa.sign(Buffer.from(plaintext), 'base64', 'utf8');

            return {
                hashValor: signature,
                plaintext,
                numeracaoFactura,
                referencia: reference_key,
                numSequenciaFactura,
                dataVencimento: dueDate
            };
        } catch (error) {
            console.error('❌ Erro ao gerar hash e sequência da fatura:', error);

            if (error instanceof BadRequestException) throw error;

            throw new InternalServerErrorException(
                'Falha na geração da assinatura digital ou sequenciamento.'
            );
        }
    }
}
