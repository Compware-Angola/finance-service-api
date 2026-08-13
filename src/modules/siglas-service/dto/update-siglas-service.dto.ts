// dto/update-sigla-tipo-servico.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSiglaTipoServicoDto } from './create-siglas-service.dto';

export class UpdateSiglaTipoServicoDto extends PartialType(
  CreateSiglaTipoServicoDto,
) {}
