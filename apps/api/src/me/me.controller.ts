import type { Me } from '@env/shared';
import { Controller, Get } from '@nestjs/common';
import { CurrentAuth, NoTeam } from '../auth/decorators';
import type { VerifiedToken } from '../auth/token-verifier';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  // `@NoTeam`: é a rota que diz ao app se a pessoa tem equipe.
  @NoTeam()
  @Get()
  get(@CurrentAuth() auth: VerifiedToken): Promise<Me> {
    return this.me.getMe(auth);
  }
}
