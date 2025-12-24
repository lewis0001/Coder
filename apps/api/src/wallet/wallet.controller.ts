import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/topup.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { AuthUser } from '../auth/types/auth-user';
import { ApplyPromoDto } from './dto/apply-promo.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@Req() req: { user: AuthUser }) {
    return this.walletService.getWallet(req.user.sub);
  }

  @Get('transactions')
  listTransactions(@Req() req: { user: AuthUser }, @Query() query: ListTransactionsDto) {
    return this.walletService.listTransactions(req.user.sub, query);
  }

  @Post('topup')
  topUp(@Req() req: { user: AuthUser }, @Body() payload: TopUpDto) {
    return this.walletService.topUp(req.user.sub, payload);
  }

  @Post('apply-promo')
  applyPromo(@Req() req: { user: AuthUser }, @Body() payload: ApplyPromoDto) {
    return this.walletService.applyPromo(req.user.sub, payload);
  }
}
