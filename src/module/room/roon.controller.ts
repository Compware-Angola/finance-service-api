import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';

import { UpdateRoonDto } from './dto/update-roon.dto';
import { RoomService } from './roon.service';
import { CreateRoomDto } from './dto/create-roon.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('room')
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

  @Get("types")
  @ApiOperation({
    summary: 'Listar tipos de salas',
    description: 'Retorna uma lista de todos os tipos de salas disponíveis no sistema.',
  })
  async getAllTypeRooms() {
    return this.roomService.getAllTypeRooms();
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
