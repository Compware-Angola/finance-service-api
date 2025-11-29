// src/common/base-entity.ts
import { Repository } from 'typeorm';

export class BaseEntity {
  static repo: Repository<any>;

  static setRepository(repo: Repository<any>) {
    this.repo = repo;
  }
}