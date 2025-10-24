import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CompanyKey {
  /**
   * Lê a chave privada diretamente do arquivo.
   */
  public async getPrivateKey(): Promise<string> {
    const privateKeyPath = join(process.cwd(), 'private_rsa.key');
    return readFileSync(privateKeyPath, 'utf8');
  }

  /**
   * Lê a chave pública diretamente do arquivo.
   */
  public async getPublicKey(): Promise<string> {
    const publicKeyPath = join(process.cwd(), 'public_rsa.key');
    return readFileSync(publicKeyPath, 'utf8');
  }
}
