import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
    ServiceUnavailableException,
    HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecodedUserPayload } from 'src/common/types/token-validation-response.interface';

interface ValidateTokenResponse {
    valid: boolean;
    user?: DecodedUserPayload;
}

@Injectable()
export class RemoteJwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(RemoteJwtAuthGuard.name);
    private readonly http: AxiosInstance;
    private readonly authServiceUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.http = axios.create({ timeout: 8000 });

        const baseUrl = this.configService.get<string>('HASH_SERVICE_URL');
        if (!baseUrl) {
            throw new Error('HASH_SERVICE_URL não configurada');
        }
        this.authServiceUrl = `${baseUrl}/auth/validate-token`;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Token não fornecido');
        }

        const user = await this.validateToken(token);
        request.user = user;
        return true;
    }

    private async validateToken(token: string): Promise<DecodedUserPayload> {
        try {
            const { data } = await this.http.get<ValidateTokenResponse>(
                this.authServiceUrl,
                { headers: { Authorization: `Bearer ${token}` } },
            );

            if (!data?.valid || !data.user) {
                throw new UnauthorizedException('Token inválido');
            }

            return data.user;
        } catch (error) {
            // Se já é uma exceção HTTP nossa (ex: UnauthorizedException acima), apenas repropaga
            if (error instanceof HttpException) {
                throw error;
            }

            if (isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new ServiceUnavailableException('Auth service timeout');
                }
                if (error.response?.status === 401) {
                    throw new UnauthorizedException('Token inválido');
                }

                this.logger.error('Falha ao validar token remotamente', {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                });
            } else {
                this.logger.error('Erro inesperado ao validar token', error);
            }

            throw new ServiceUnavailableException(
                'Serviço de autenticação indisponível',
            );
        }
    }

    private extractTokenFromHeader(request: any): string | null {
        const authHeader = request.headers?.authorization;
        if (!authHeader || typeof authHeader !== 'string') return null;

        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

        return token;
    }
}