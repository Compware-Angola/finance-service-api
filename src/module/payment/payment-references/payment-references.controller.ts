import { 
  Controller, 
  Post, 
  Body,  
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { PaymentReferencesService } from './payment-references.service'
import { CreatePaymentReferenceDto } from './dto/create-payment-reference.dto'

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
    return this.paymentReferencesService.create(createPaymentReferenceDto)
  }


  @Post("/all/mensalidades")
  @ApiOperation({ summary: 'Criar referências de pagamento para todas as mensalidades pendentes' })
  @ApiResponse({ status: 201, description: 'Referências criadas com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  createAllMensalidades(@Body() createPaymentReferenceDto: CreatePaymentReferenceDto) {
    return this.paymentReferencesService.createMonthlyPaymentReferences(createPaymentReferenceDto)
  }

}
