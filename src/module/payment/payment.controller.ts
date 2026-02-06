import { Controller, Get, Query, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Payment } from './entities/payment.entity';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StudentPaymentResponseDto, StudentPaymentsQueryDto } from './dto/student-payment.dto';

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
  @ApiResponse({ status: 200, "description": 'Lista de pagamentos filtrada e paginada.', type: StudentPaymentResponseDto })
  async findByAnoLectivoAndPreInscricao(
    @Param('academicYear', ParseIntPipe) academicYear: string,
    @Param('preInscritionCode', ParseIntPipe) preInscritionCode: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<StudentPaymentResponseDto> {
    return this.paymentService.findInvoicesAndItemsDetailedFlat(
      academicYear,
      preInscritionCode,
      paginationQuery,
    );
  }



  @Get('studentPayments')
  @ApiOperation({ summary: 'Listar pagamentos do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos do aluno.',
    type: StudentPaymentResponseDto
  })
  async getStudentPayments(
    @Query() query: StudentPaymentsQueryDto
  ): Promise<StudentPaymentResponseDto> {
    return this.paymentService.studentPayments(query);
  }
}