import { Injectable } from '@nestjs/common';
import { CreateInstitutionalContractDto } from './dto/create-institutional-contract.dto';
import { UpdateInstitutionalContractDto } from './dto/update-institutional-contract.dto';

@Injectable()
export class InstitutionalContractService {
  create(createInstitutionalContractDto: CreateInstitutionalContractDto) {
    return 'This action adds a new institutionalContract';
  }

  findAll() {
    return `This action returns all institutionalContract`;
  }

  findOne(id: number) {
    return `This action returns a #${id} institutionalContract`;
  }

  update(id: number, updateInstitutionalContractDto: UpdateInstitutionalContractDto) {
    return `This action updates a #${id} institutionalContract`;
  }

  remove(id: number) {
    return `This action removes a #${id} institutionalContract`;
  }
}
