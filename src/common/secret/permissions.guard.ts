import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../pipes/permissions.decorator'; // ajusta o caminho
import { PermissionType, PermissionTypeDetails } from '../enums/permission.type';

declare module 'express' {
  interface Request {
    user: any; // podes melhorar este tipo se tiveres um User entity/dto
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém as siglas requeridas pelo decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não houver permissões definidas, permite acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();

  
    
    const userPermissions: string[] = req.user?.permissions || [];

    // Verifica se o utilizador tem FULL_ACCESS
    if (userPermissions.includes(PermissionTypeDetails.FULL_ACCESS.sigla)) {
      return true;
    }

    // Verifica se tem todas as permissões necessárias
    const hasAllRequired = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException(
        'Você não tem as permissões necessárias para acessar este recurso.',
      );
    }

    return true;
  }
}