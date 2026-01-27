import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, ParseIntPipe, UseGuards } from '@nestjs/common'; // Importação do ParseIntPipe
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

import { Invoice } from './entities/invoice.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { InvoiceFilterEnrollmentDto } from './dto/Invoice-filter-enrollment-code.dto';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { InvoiceSearchDto } from './dto/get-invoice.dto';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { RequiredPermissions } from 'src/common/pipes/permissions.decorator';
import { PermissionTypeDetails } from 'src/common/enums/permission.type';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) { }

  // ------------------------------------
  // 1. CREATE (POST)
  // ------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova fatura' })
  @ApiResponse({ status: 201, "description": 'Fatura criada com sucesso.' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto){
    return this.invoiceService.queueCreateInvoice(createInvoiceDto);
  }
   @Post('no-job')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova fatura' })
  @ApiResponse({ status: 201, "description": 'Fatura criada com sucesso.' })
  async create2(@Body() createInvoiceDto: CreateInvoiceDto){
    return this.invoiceService.create(createInvoiceDto);
  }


  // ------------------------------------
  // 2. FIND ALL (GET) - COM PAGINAÇÃO
  // ------------------------------------
  @Get()
    @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  //@RequiredPermissions(PermissionTypeDetails)
  @ApiOperation({ summary: 'Retorna todas as faturas com paginação' })
  @ApiResponse({ status: 200, "description": 'Lista de faturas retornada com sucesso.' })
  async findAll(@Query() paginationQuery: InvoiceSearchDto): Promise<PagedResult<Invoice>> {
    return this.invoiceService.findInvoices(paginationQuery);
  }


  @Get('types')
  @ApiOperation({ summary: 'Retorna todos os tipos de documento de faturação' })
  @ApiResponse({ status: 200, "description": 'Lista de tipos de documento de faturação retornada com sucesso.' })
  async findAllTypeInvoiceDocument(): Promise<TypeInvoiceDocument[]> {
    return this.invoiceService.findAllTypeInvoiceDocument();
  }

  // ------------------------------------
  // 6. FIND BY MATRICULA (GET /invoices/by-matricula)
  // ------------------------------------
  @Get('by-matricula')
  @ApiOperation({ summary: 'Retorna faturas por Código de Matrícula, "com" paginação' })
  @ApiResponse({ status: 200, "description": 'Lista de faturas filtrada.' })
  async findByMatricula(
    @Query() filterQuery: InvoiceFilterEnrollmentDto
  ): Promise<PagedResult<Invoice>> {
    // Este método está correto, "pois" o ValidationPipe em main.ts lida com o DTO de query.
    return this.invoiceService.findByEnrollmentCode(filterQuery);
  }

  // ------------------------------------
  // 3. FIND ONE (GET :id) - CORRIGIDO O NaN
  // ------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Busca uma fatura pelo Código' })
  @ApiParam({ name: 'id', "description": 'O Código (ID) da fatura', "type": Number })
  @ApiResponse({ status: 200, "description": 'Fatura encontrada.', "type": Invoice })
  @ApiResponse({ status: 400, "description": 'ID da fatura inválido.' })
  @ApiResponse({ status: 404, "description": 'Fatura não encontrada.' })
  async findOne(@Param('id', ParseIntPipe) Codigo: number): Promise<Invoice> {
    return this.invoiceService.findOne(Codigo);
  }

/**
   * Lista os itens de uma factura pelo ID da factura
   */
  @Get(':id/itens')
  async findInvoiceItens(
    @Param('id', ParseIntPipe) invoiceId: number,
  ) {
    const itens = await this.invoiceService.findInvoiceItens(invoiceId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Itens da factura listados com sucesso',
      data: itens,
    };
  }
}