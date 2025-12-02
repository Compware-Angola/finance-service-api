import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-roon.dto';

export class UpdateRoonDto extends PartialType(CreateRoomDto) {}
