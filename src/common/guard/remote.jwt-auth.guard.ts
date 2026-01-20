import axios from 'axios';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { DecodedUserPayload } from '../types/token-validation-response.interface';

@Injectable()
export class RemoteJwtAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Token não fornecido');
        }
        const hashServiceUrl = process.env.HASH_SERVICE_URL;

        try {
            const response = await axios.get(
                `${hashServiceUrl}/auth/validate-token`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 5000,
                },
            );

            if (!response.data?.valid) {
                throw new UnauthorizedException('Token inválido');
            }
          

            request.user = response.data.user as DecodedUserPayload;
            return true;
        } catch (error) {
            console.log(error);

            throw new UnauthorizedException('Token inválido ou serviço indisponível');
        }
    }

    private extractTokenFromHeader(request: any): string | null {
        const authHeader = request.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        return authHeader.split(' ')[1];
    }
}
