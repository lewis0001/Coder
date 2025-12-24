import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BoxService } from './box.service';
import { EstimateShipmentDto } from './dto/estimate-shipment.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';

@Controller('box')
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Post('estimate')
  async estimate(@Body() body: EstimateShipmentDto) {
    return this.boxService.estimate(body);
  }

  @Post('shipments')
  async createShipment(@Body() body: CreateShipmentDto) {
    return this.boxService.createShipment(body);
  }

  @Get('shipments/:id')
  async getShipment(@Param('id') id: string) {
    return this.boxService.getShipment(id);
  }
}
