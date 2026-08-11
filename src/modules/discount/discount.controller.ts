import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { DiscountService } from './discount.service';
import { FilterDiscountDto } from './dto/filter-discount.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FilterAddDiscountDto } from './dto/filter-add-discount.dto';
import { CreateAddDiscountDto } from './dto/create-add-discount.dto';
import { UpdateAddDiscountDto } from './dto/update-add-discount.dto';
import { FilterDiscountSiglaDto } from './dto/filters-discount-sigla';

@ApiTags('discount')
@Controller('discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Get('add')
  @ApiOperation({
    summary: 'Listar atribuições de descontos',
  })
  findAllAddDiscount(@Query() filters: FilterAddDiscountDto) {
    return this.discountService.findAllAdd(filters);
  }

  @Post('add')
  @ApiOperation({
    summary: 'Atribuir um novo desconto',
  })
  addDiscount(@Body() createDto: CreateAddDiscountDto) {
    return this.discountService.addDiscount(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar descontos',
  })
  findAll(@Query() filters: FilterDiscountDto) {
    return this.discountService.findAll(filters);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar um novo desconto',
  })
  create(@Body() createDto: CreateDiscountDto) {
    return this.discountService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar um desconto',
  })
  update(@Param('id') id: number, @Body() updateDto: UpdateDiscountDto) {
    return this.discountService.update(id, updateDto);
  }

  @Patch('add/:id')
  @ApiOperation({
    summary: 'Atualizar um desconto',
  })
  updateAddDiscount(
    @Param('id') id: number,
    @Body() updateDto: UpdateAddDiscountDto,
  ) {
    return this.discountService.updateAddDiscount(id, updateDto);
  }

  @Delete('add/:id')
  @ApiOperation({
    summary: 'Remove um desconto atribuído a um aluno',
  })
  removeAddDiscount(@Param('id', ParseIntPipe) id: number) {
    return this.discountService.removeAddDiscount(id);
  }
  @Get('/sigla/:sigla')
  @ApiOperation({
    summary: 'Listar descontos por sigla',
  })
  findBySigla(@Param('sigla') sigla: string) {
    return this.discountService.buscarDescontoEspecialPorSigla(sigla);
  }
}
