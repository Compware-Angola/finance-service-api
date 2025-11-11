import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common'; // Importação do ParseIntPipe
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

import { Invoice } from './entities/invoice.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { InvoiceFilterEnrollmentDto } from './dto/Invoice-filter-enrollment-code.dto';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';

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

  // ------------------------------------
  // 2. FIND ALL (GET) - COM PAGINAÇÃO
  // ------------------------------------
  @Get()
  @ApiOperation({ summary: 'Retorna todas as faturas com paginação' })
  @ApiResponse({ status: 200, "description": 'Lista de faturas retornada com sucesso.' })
  async findAll(@Query() paginationQuery: PaginationQueryDto): Promise<PagedResult<Invoice>> {
    return this.invoiceService.findAll(paginationQuery);
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

 /*
  // ------------------------------------
  // 4. UPDATE (PATCH :id) - CORRIGIDO O NaN
  // ------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma fatura existente' })
  @ApiParam({ name: 'id', "description": 'O Código (ID) da fatura a ser atualizada', "type": Number })
  @ApiResponse({ status: 400, "description": 'ID da fatura inválido.' }) // Adicionado 400
  @ApiResponse({ status: 200, "description": 'Fatura atualizada com sucesso.', "type": Invoice })
  @ApiResponse({ status: 404, "description": 'Fatura não encontrada.' })
  async update(@Param('id', ParseIntPipe) Codigo: number, @Body() updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    return this.invoiceService.update(Codigo, "update"InvoiceDto);
  }
  ------------------------------------
  // 5. REMOVE (DELETE :id) - CORRIGIDO O NaN
  // ------------------------------------
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma fatura pelo Código' })
  @ApiParam({ name: 'id', "description": 'O Código (ID) da fatura a ser removida', "type": Number })
  @ApiResponse({ status: 400, "description": 'ID da fatura inválido.' }) // Adicionado 400
  @ApiResponse({ status: 204, "description": 'Fatura removida com sucesso.' })
  @ApiResponse({ status: 404, "description": 'Fatura não encontrada.' })
  async remove(@Param('id', ParseIntPipe) Codigo: number): Promise<void> {
    await this.invoiceService.remove(Codigo);
  }
   */
}