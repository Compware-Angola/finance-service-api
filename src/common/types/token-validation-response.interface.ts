// src/auth/types/token-validation-response.interface.ts
// ou onde preferires colocar (ex: shared/types, auth/types, etc.)

/**
 * Resposta do endpoint de validação de token (ex: /validate-token)
 */
export interface TokenValidationResponse {
  /**
   * Indica se o token é válido
   */
  valid: boolean;

  /**
   * Dados do utilizador extraídos do JWT (apenas se valid === true)
   */
  user?: DecodedUserPayload;
}

/**
 * Payload decodificado do JWT com informações do utilizador
 */
export interface DecodedUserPayload {
  /**
   * Nome de utilizador
   */
  username: string;

  /**
   * ID do utilizador (subject)
   */
  sub: number;

  /**
   * Lista de siglas das permissões que o utilizador possui
   */
  permissions: string[];

  /**
   * Grupos aos quais o utilizador pertence
   * (podes deixar como any[] se não precisares de tipagem forte,
   * ou criar uma interface separada se souberes a estrutura exata)
   */
  groups: any[]; // ou Group[] se tiveres a estrutura dos grupos

  /**
   * Issued at - timestamp UNIX de quando o token foi emitido
   */
  iat: number;

  /**
   * Expiration - timestamp UNIX de quando o token expira
   */
  exp: number;

  // Outros campos opcionais que possam vir no futuro
  [key: string]: any; // flexibilidade para campos extras
}

/**
 * Tipo auxiliar mais usado no request.user
 * (muito comum em guards e controllers)
 */
export type RequestUser = Pick<DecodedUserPayload, 'username' | 'sub' | 'permissions'>;