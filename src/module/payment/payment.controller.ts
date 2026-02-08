import { Controller, Get, Query, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StudentPaymentsQueryDto } from './dto/student-payment.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }
  @Post('create')
  @ApiOperation({ summary: 'Cria um novo pagamento.' })
  @ApiResponse({ status: 201, "description": 'Pagamento criado com sucesso.' })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment | any> {
    return this.paymentService.createPayment(createPaymentDto);
  }
  @Get('get/:academicYear/:preInscritionCode')
  @ApiOperation({
    summary: 'Lista pagamentos por Ano Lectivo e Código de Pré-Inscrição, "com" paginação.'
  })
  @ApiResponse({ status: 200, "description": 'Lista de pagamentos filtrada e paginada.', })
  async findByAnoLectivoAndPreInscricao(
    @Param('academicYear', ParseIntPipe) academicYear: string,
    @Param('preInscritionCode', ParseIntPipe) preInscritionCode: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.paymentService.findInvoicesAndItemsDetailedFlat(
      academicYear,
      preInscritionCode,
      paginationQuery,
    );
  }
  @Get('student-payments')
  @ApiOperation({ summary: 'Listar pagamentos do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos do aluno.',

  })
  async getStudentPayments(
    @Query() query: StudentPaymentsQueryDto
  ) {
    return this.paymentService.studentPayments(query);
  }

  @Get('student-payments/:facturaCode/details')
  @ApiOperation({ summary: 'Detalhe completo de uma fatura do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Itens detalhados da fatura.',
    isArray: true,
  })
  async getStudentPaymentDetails(
    @Param('facturaCode', ParseIntPipe) facturaCode: number,
  ) {
    return this.paymentService.studentPaymentsDetails(facturaCode);
  }
}