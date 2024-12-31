import { Injectable } from '@nestjs/common';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';

@Injectable()
export class ConsumablesService {
  create(createConsumableDto: CreateConsumableDto) {
    return 'This action adds a new consumable';
  }

  findAll() {
    return `This action returns all consumables`;
  }

  findOne(id: number) {
    return `This action returns a #${id} consumable`;
  }

  update(id: number, updateConsumableDto: UpdateConsumableDto) {
    return `This action updates a #${id} consumable`;
  }

  remove(id: number) {
    return `This action removes a #${id} consumable`;
  }
}
