import { 
  Controller, 
  Post, 
  Body,
  Put,
  Param,
  ParseIntPipe,
  Patch,  
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { PaymentReferencesService } from './payment-references.service'
import { CreatePaymentReferenceDto } from './dto/create-payment-reference.dto'
import { RenewReferenceDto } from './dto/renew-refence.dto'

@ApiTags('REFERÊNCIAS DE PAGAMENTO')
@Controller('/payment-references')
export class PaymentReferencesController {
  constructor(
    private readonly paymentReferencesService: PaymentReferencesService,
  ) {}

  /**
   * 📦 Cria uma nova referência de pagamento
   */
  @Post()
  @ApiOperation({ summary: 'Criar uma nova referência de pagamento' })
  @ApiBody({ type: CreatePaymentReferenceDto })
  @ApiResponse({ status: 201, description: 'Referência criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() createPaymentReferenceDto: CreatePaymentReferenceDto) {
    return this.paymentReferencesService.queueCreatePaymentReferences(createPaymentReferenceDto)
  }


  @Post("/all/mensalidades")
  @ApiOperation({ summary: 'Criar referências de pagamento para todas as mensalidades pendentes' })
  @ApiResponse({ status: 201, description: 'Referências criadas com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  createAllMensalidades(@Body() createPaymentReferenceDto: CreatePaymentReferenceDto) {
    return this.paymentReferencesService.queuecreateMonthlyPaymentReferences(createPaymentReferenceDto)
  }

@Patch("/renew/reference/:invoiceId")
@ApiOperation({ summary: 'Renovar uma referência de pagamento' })
@ApiResponse({ status: 201, description: 'Referência renovada com sucesso.' })
@ApiResponse({ status: 400, description: 'Dados inválidos.' })
renewReference(
  @Param('invoiceId', ParseIntPipe) invoiceId: number,
) {
  return this.paymentReferencesService.queueUpdatePaymentReferences(invoiceId);
}




}
