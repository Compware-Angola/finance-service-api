import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
  Req,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StudentPaymentsQueryDto } from './dto/student-payment.dto';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from 'src/common/helpers/access-log.helper';
import { RequiredPermissions } from 'src/common/pipes/permissions.decorator';
import { PermissionTypeDetails } from 'src/common/enums/permission.type';
import { ListPaymentDTO } from './dto/list-payment.dto';
import { FindPaymentMonthlyDTO } from './dto/find-payment-monthly.dto';
import { ListarServicosPagosAlunoDto } from './dto/listar-servico-pagos.dto';
import { EstatisticasService } from './estatisticas.service';
import { EstatisticasQueryDto } from './dto/estatisticas-query.dto';
import { VoidPaymentService } from './void-payments.service';
import { VoidPaymentDTO } from './dto/void-payment.dto';
import { VoidPaymentTaxService } from './void-payments-tax.service';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private httpService: HttpService,
    private readonly estatisticasService: EstatisticasService,
    private readonly voidPaymentService: VoidPaymentService,
    private readonly voidPaymentServiceTax: VoidPaymentTaxService,
  ) {}
  @Post('create')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @RequiredPermissions(PermissionTypeDetails.LIQUIDAR_NOTA_PAGAMENTO.sigla)
  @ApiOperation({ summary: 'Cria um novo pagamento.' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso.' })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: any,
  ): Promise<Payment | any> {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    const payment = await this.paymentService.createPayment(
      createPaymentDto,
      user,
    );
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} criou um pagamento com código de fatura ${createPaymentDto.codigoFactura}`,
      fkUtilizadorResponsavel: user?.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });
    return payment;
  }
  @Get('get/:academicYear/:preInscritionCode')
  @ApiOperation({
    summary:
      'Lista pagamentos por Ano Lectivo e Código de Pré-Inscrição, "com" paginação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos filtrada e paginada.',
  })
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
  @Get('servicos-pagos-aluno')
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number, example: 23 })
  @ApiQuery({
    name: 'codigoMatricula',
    required: true,
    type: Number,
    example: 40014,
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['TODOS', 'MENSALIDADES', 'SERVICOS'],
    example: 'TODOS',
  })
  async listarServicosPagosAluno(@Query() filter: ListarServicosPagosAlunoDto) {
    return this.paymentService.listarServicosPagosAluno(filter);
  }
  @Get('student-payments')
  @ApiOperation({ summary: 'Listar pagamentos do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos do aluno.',
  })
  async getStudentPayments(@Query() query: StudentPaymentsQueryDto) {
    return this.paymentService.studentPayments(query);
  }
  @Get('list-payments')
  @ApiOperation({ summary: 'Listar pagamentos realizados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos realizados.',
  })
  async getPayments(@Query() query: ListPaymentDTO) {
    return this.paymentService.findPayments(query);
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
  @Get('monthly')
  @ApiOperation({ summary: 'Lista de pagamentos por mensalidades' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos por mensalidades.',
  })
  async findPaymentMonthly(@Query() query: FindPaymentMonthlyDTO) {
    return this.paymentService.findPaymentMonthly(query);
  }

  @Get('estatisticas')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getEstatisticasAgrupado(@Query() query: EstatisticasQueryDto) {
    return this.estatisticasService.getAgrupado(query);
  }

  @Post('void-payment')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Anular um pagamento.' })
  @ApiResponse({ status: 201, description: 'Pagamento anulado com sucesso.' })
  async voidPayment(
    @Body() dto: VoidPaymentDTO,
    @Req() req: any,
  ): Promise<Payment | any> {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await this.voidPaymentService.anularPagamento(dto, user?.sub);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} anulou um pagamento com código de pagamento ${dto.codigoPagamento}`,
      fkUtilizadorResponsavel: user?.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });
  }

  @Post('void-payment-tax')
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Anular multa de Pagamento.' })
  @ApiResponse({
    status: 201,
    description: 'Anulado multa de Pagamento  com sucesso.',
  })
  async voidPaymentTax(
    @Body() dto: VoidPaymentDTO,
    @Req() req: any,
  ): Promise<Payment | any> {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    await this.voidPaymentServiceTax.anularMulta(dto, user?.sub);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} anulou a multa com código de pagamento ${dto.codigoPagamento}`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
  }
}
