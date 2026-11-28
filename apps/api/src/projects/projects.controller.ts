import {
  type CreateProjectInput,
  createProjectSchema,
  type Project,
  type UpdateProjectInput,
  updateProjectSchema,
} from '@env/shared';
import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentMember } from '../auth/decorators';
import type { Member } from '../auth/request';
import { ZodValidationPipe } from '../common/zod.pipe';
import { ProjectsService } from './projects.service';

// Sem decorator de acesso: o `TeamGuard` global já exige token e equipe, e admins e membros
// podem gerir projetos. O `teamId` vem só do `@CurrentMember()`, nunca do corpo ou da URL.
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentMember() member: Member): Promise<Project[]> {
    return this.projects.list(member.teamId);
  }

  @Post()
  create(
    @CurrentMember() member: Member,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
  ): Promise<Project> {
    return this.projects.create(member.teamId, body);
  }

  @Patch(':project')
  rename(
    @CurrentMember() member: Member,
    @Param('project') slug: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
  ): Promise<Project> {
    return this.projects.rename(member.teamId, slug, body);
  }

  // Um `POST` responderia 201, mas arquivar não cria nada.
  @HttpCode(200)
  @Post(':project/archive')
  archive(@CurrentMember() member: Member, @Param('project') slug: string): Promise<Project> {
    return this.projects.archive(member.teamId, slug);
  }
}
