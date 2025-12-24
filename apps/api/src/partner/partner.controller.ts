import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PartnerService } from './partner.service';
import { AuthUser } from '../auth/types/auth-user';
import { ReqUser } from '../common/req-user.decorator';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Controller('partner/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  getCatalog(@ReqUser() user: AuthUser) {
    return this.partnerService.getCatalog(user.sub);
  }

  @Put('products/:id')
  updateProduct(@ReqUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.partnerService.updateProduct(user.sub, id, body);
  }

  @Put('products/:id/inventory')
  updateInventory(
    @ReqUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateInventoryDto,
  ) {
    return this.partnerService.updateInventory(user.sub, id, body);
  }

  @Put('variants/:id')
  updateVariant(
    @ReqUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateVariantDto,
  ) {
    return this.partnerService.updateVariant(user.sub, id, body);
  }
}
