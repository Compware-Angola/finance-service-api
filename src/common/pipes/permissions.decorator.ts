import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para definir as permissões necessárias (usando as siglas).
 *
 * Exemplo:
 * @RequiredPermissions('mgea_atp', 'mga_a_lan')
 * ou
 * @RequiredPermissions(PermissionTypeDetails.ATRIBUIR_PROVA.sigla)
 */
export const RequiredPermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);