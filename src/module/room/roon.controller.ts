import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe, Put } from '@nestjs/common';

import { UpdateRoonDto } from './dto/update-roon.dto';
import { RoomService } from './roon.service';
import { CreateRoomDto } from './dto/create-roon.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('rooms')
export class RoonController {
  constructor(private readonly roomService: RoomService) { }

  @Post("")
  @HttpCode(HttpStatus.CREATED) 
  @ApiOperation({
    summary: 'Criar uma nova sala',
    description: 'Regista uma nova sala no sistema com todas as características físicas e administrativas.',
  })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(createRoomDto);
  }
  @Get("/list-all")
  @ApiOperation({
    summary: 'Listar todas as salas',
    description: 'Retorna uma lista de todas as salas registradas no sistema.',
  })
  async getAllRooms() {
    return this.roomService.fecthAllRooms();
  }
  @Get("types")
  @ApiOperation({
    summary: 'Listar tipos de salas',
    description: 'Retorna uma lista de todos os tipos de salas disponíveis no sistema.',
  })
  async getAllTypeRooms() {
    return this.roomService.getAllTypeRooms();
  }
  @Get(':codigo')
  @ApiOperation({ summary: 'Obter detalhes de uma sala pelo código' })
  @ApiParam({ name: 'codigo', description: 'Código numérico da sala', example: 219 })
  @ApiResponse({ status: 200, description: 'Detalhes da sala' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async getRoomByCodigo(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.roomService.getRoomById(codigo);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Atualizar detalhes de uma sala' })
  @ApiParam({ name: 'codigo', description: 'Código numérico da sala', example: 219 })
  @ApiResponse({ status: 200, description: 'Sala atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  async updateRoom(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() updateRoonDto: UpdateRoonDto
  ) {
    return this.roomService.updateRoom(codigo, updateRoonDto);
  }


@Delete(':codigo')
@ApiOperation({ summary: 'EXCLUIR DEFINITIVAMENTE uma sala (hard delete)' })
@ApiParam({ name: 'codigo', description: 'Código numérico da sala', example: 219 })
@ApiResponse({ status: 200, description: 'Sala excluída permanentemente' })
@ApiResponse({ status: 400, description: 'Código inválido' })
@ApiResponse({ status: 404, description: 'Sala não encontrada' })
async hardDeleteRoom(@Param('codigo', ParseIntPipe) codigo: number) {
  return this.roomService.deleteRoom(codigo);
}
}
