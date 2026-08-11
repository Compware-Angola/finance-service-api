import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, IsBoolean, IsNumber } from 'class-validator';

export class AppyPayWebhookDto {
  @ApiProperty({
    description: 'ID da transação no AppyPay',
    example: '57d78ab6-4acd-4ce7-9ba8-47d2922865e3',
    required: false,
  })
  @IsOptional()
  id?: any;

  @ApiProperty({
    description: 'Status da operação',
    example: 'Paid',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Informações sobre o status da resposta',
    required: false,
    example: {
      successful: true,
      status: 'Pending',
      code: 101,
      message: 'A solicitação foi aceita para processamento.',
      reference: { referenceNumber: '401392944', "entity": '10065' },
    },
  })
  @IsOptional()
  @IsObject()
  responseStatus?: {
    successful?: boolean;
    status?: string;
    code?: number;
    message?: string;
    reference?: {
      referenceNumber?: string;
      dueDate?: string;
      entity?: string;
    };
  };

  @ApiProperty({
    description: 'Informações diretas da referência',
    required: false,
    example: {
      referenceNumber: '401392944',
      dueDate: '2025-10-30T00:00:00',
      entity: '10065',
    },
  })
  @IsOptional()
  @IsObject()
  reference?: {
    referenceNumber?: string;
    dueDate?: string;
    entity?: string;
  };
}
