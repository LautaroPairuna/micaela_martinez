import { Controller, Get } from '@nestjs/common';
import { HeroService } from './hero.service';

@Controller('hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get('images')
  async getHeroImages() {
    return this.heroService.getActiveImages();
  }
}
