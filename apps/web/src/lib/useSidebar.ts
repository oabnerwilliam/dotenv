// A escolha do menu lateral: estado global do navegador (Zustand), guardado no `localStorage`.
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { useIsNarrow } from './useIsNarrow';

type Choice = 'expanded' | 'collapsed';

type Saved = { choice: Choice | null };

type SidebarState = Saved & { choose: (choice: Choice) => void };

// O armazenamento pode estar bloqueado ou cheio (janela anônima, política do navegador), e o
// Zustand não trata o erro. Sem ele, a escolha só vale até a página ser recarregada.
const safeStorage: PersistStorage<Saved> = {
  getItem: (name) => {
    try {
      return JSON.parse(window.localStorage.getItem(name) ?? 'null');
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Ver o comentário acima.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ver o comentário acima.
    }
  },
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      // `null`: a pessoa ainda não escolheu.
      choice: null,
      choose: (choice) => set({ choice }),
    }),
    {
      name: 'env.sidebar',
      storage: safeStorage,
      partialize: ({ choice }) => ({ choice }),
      // O que vem do armazenamento pode ter sido editado: só entra um valor conhecido.
      merge: (saved, current) => {
        const choice = (saved as Partial<Saved> | undefined)?.choice;
        return choice === 'expanded' || choice === 'collapsed' ? { ...current, choice } : current;
      },
    },
  ),
);

/** Sem escolha salva, o menu começa aberto na tela larga e fechado na estreita. */
export function useSidebar(): { collapsed: boolean; toggle(): void } {
  const choice = useSidebarStore((state) => state.choice);
  const choose = useSidebarStore((state) => state.choose);
  const narrow = useIsNarrow();
  const collapsed = choice === null ? narrow : choice === 'collapsed';

  return { collapsed, toggle: () => choose(collapsed ? 'expanded' : 'collapsed') };
}
