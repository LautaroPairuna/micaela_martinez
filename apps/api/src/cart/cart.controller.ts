import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { SyncCartDto } from './dto/sync-cart.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: JwtUser) {
    console.log(`[Cart] GetCart for user ${user.sub}`);
    return this.cartService.getCart(user.sub);
  }

  @Post('sync')
  syncCart(@CurrentUser() user: JwtUser, @Body() dto: SyncCartDto) {
    console.log(
      `[Cart] SyncCart for user ${user.sub} with ${dto.items?.length} items`,
    );
    return this.cartService.syncCart(user.sub, dto.items);
  }

  @Delete('item')
  removeItem(
    @CurrentUser() user: JwtUser,
    @Query('type') type: 'producto' | 'curso',
    @Query('refId') refId: string,
  ) {
    return this.cartService.removeItem(user.sub, type, Number(refId));
  }

  @Delete()
  clearCart(@CurrentUser() user: JwtUser) {
    return this.cartService.clearCart(user.sub);
  }
}
