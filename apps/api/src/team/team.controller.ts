import { type CreateTeamInput, createTeamSchema, type Me } from '@env/shared';
import { Body, Controller, Post } from '@nestjs/common';
import { CurrentAuth, NoTeam } from '../auth/decorators';
import type { VerifiedToken } from '../auth/token-verifier';
import { ZodValidationPipe } from '../common/zod.pipe';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  // `@NoTeam`: a equipe ainda não existe. Quem pode criar é conferido no serviço.
  @NoTeam()
  @Post()
  create(
    @CurrentAuth() auth: VerifiedToken,
    @Body(new ZodValidationPipe(createTeamSchema)) body: CreateTeamInput,
  ): Promise<Me> {
    return this.team.create(auth, body);
  }
}
