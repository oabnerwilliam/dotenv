import { z } from 'zod';
import { nameSchema, slugSchema } from './team';

// Um projeto como a API o devolve. Campos que não estão aqui são descartados.
export const projectSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });

// Resposta de `GET /projects`.
export const projectListSchema = z.array(projectSchema);

// Corpo de `POST /projects`.
export const createProjectSchema = z.object({ name: nameSchema('do projeto'), slug: slugSchema });

// Corpo de `PATCH /projects/:project`. Só o nome: o endereço não muda, para não quebrar links.
export const updateProjectSchema = z.object({ name: nameSchema('do projeto') });

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
