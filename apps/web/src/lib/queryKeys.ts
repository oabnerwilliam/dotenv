// Chaves do React Query: um lugar só, para consulta e invalidação usarem a mesma.
export const queryKeys = {
  health: ['health'] as const,
  // Com o id da pessoa na chave, a resposta de uma nunca é mostrada para outra.
  me: (userId: string | null) => ['me', userId] as const,
};
