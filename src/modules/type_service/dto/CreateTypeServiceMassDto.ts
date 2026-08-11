import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateTypeServiceDto } from './create-type_service.dto';

export class CreateTypeServiceMassDto {

    @ApiProperty({
        type: [CreateTypeServiceDto],
        description: 'Lista de serviços para cadastro em massa',
    })
    @ValidateNested({ each: true })
    @Type(() => CreateTypeServiceDto)
    services: CreateTypeServiceDto[];

}