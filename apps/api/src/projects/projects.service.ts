import {
  type CreateProjectInput,
  type Project as ProjectResponse,
  slugSchema,
  type UpdateProjectInput,
} from '@env/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error';
import { CLOCK, type Clock } from '../common/clock';
import { Prisma, type Project } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Campo a campo: o que a tabela guardar a mais não vai junto na resposta.
const RESPONSE_FIELDS = { id: true, name: true, slug: true } as const;

const SLUG_TAKEN = 'Este endereço já é usado por um projeto, mesmo que arquivado.';

// Toda consulta daqui recebe o `teamId` de quem chama: é a barreira entre as equipes.
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Os projetos ativos da equipe, por nome. */
  async list(teamId: string): Promise<ProjectResponse[]> {
    const projects = await this.prisma.project.findMany({
      where: { teamId, archivedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: RESPONSE_FIELDS,
    });
    // Ordenado aqui, para valer o alfabeto do português qualquer que seja a configuração do
    // banco. A ordenação é estável: nomes iguais continuam do mais antigo para o mais novo.
    return projects.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async create(teamId: string, input: CreateProjectInput): Promise<ProjectResponse> {
    try {
      return await this.prisma.project.create({
        data: { teamId, name: input.name, slug: input.slug },
        select: RESPONSE_FIELDS,
      });
    } catch (error) {
      // Sem consulta prévia: o índice único `(team_id, slug)` decide, inclusive entre duas
      // criações ao mesmo tempo. Ele também cobre os projetos arquivados.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('CONFLICT', SLUG_TAKEN, { slug: SLUG_TAKEN });
      }
      throw error;
    }
  }

  async rename(teamId: string, slug: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    return this.updateActive(teamId, slug, { name: input.name });
  }

  /** Arquivar não apaga: o histórico continua, e o endereço segue reservado. */
  async archive(teamId: string, slug: string): Promise<ProjectResponse> {
    return this.updateActive(teamId, slug, { archivedAt: this.clock.now() });
  }

  /**
   * O projeto ativo da equipe com este endereço. Inexistente, arquivado ou de outra equipe
   * lançam o mesmo `NOT_FOUND`, para ninguém descobrir o que existe nas outras.
   */
  async findOwned(teamId: string, slug: string): Promise<Project> {
    // O endereço vem da URL. O que não é um slug nem chega ao banco (um `%00` viraria erro 500).
    if (!slugSchema.safeParse(slug).success) throw notFound();

    const project = await this.prisma.project.findFirst({
      where: { teamId, slug, archivedAt: null },
    });
    if (!project) throw notFound();
    return project;
  }

  private async updateActive(
    teamId: string,
    slug: string,
    data: { name: string } | { archivedAt: Date },
  ): Promise<ProjectResponse> {
    const { id } = await this.findOwned(teamId, slug);
    // Os filtros se repetem na própria gravação: se alguém arquivou o projeto depois da busca,
    // o banco não altera linha nenhuma.
    const [updated] = await this.prisma.project.updateManyAndReturn({
      where: { id, teamId, archivedAt: null },
      data,
      select: RESPONSE_FIELDS,
    });
    if (!updated) throw notFound();
    return updated;
  }
}

function notFound(): AppError {
  return new AppError('NOT_FOUND', 'Projeto não encontrado.');
}
