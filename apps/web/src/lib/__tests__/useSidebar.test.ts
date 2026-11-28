import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNarrow } from '../../test/matchMedia';

/** Importa o módulo de novo: é o mesmo que recarregar a página, que recria o store. */
async function load() {
  vi.resetModules();
  const module = await import('../useSidebar');
  return { ...module, sidebar: renderHook(() => module.useSidebar()).result };
}

const saved = () => JSON.parse(localStorage.getItem('env.sidebar') ?? 'null') as unknown;

describe('useSidebar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('alternar grava a escolha e ela vale numa nova carga', async () => {
    const first = await load();
    expect(first.sidebar.current.collapsed).toBe(false);

    act(() => first.sidebar.current.toggle());

    expect(first.sidebar.current.collapsed).toBe(true);
    // Só a escolha é guardada.
    expect(saved()).toEqual({ state: { choice: 'collapsed' }, version: 0 });

    const second = await load();
    expect(second.sidebar.current.collapsed).toBe(true);

    act(() => second.sidebar.current.toggle());
    const third = await load();
    expect(third.sidebar.current.collapsed).toBe(false);
  });

  it('sem escolha salva, segue a largura da tela', async () => {
    const { sidebar } = await load();
    expect(sidebar.current.collapsed).toBe(false);

    act(() => setNarrow(true));
    expect(sidebar.current.collapsed).toBe(true);
    expect(saved()).toBeNull();

    // Uma escolha só: aberto na tela estreita, continua aberto na larga e de volta.
    act(() => sidebar.current.toggle());
    expect(sidebar.current.collapsed).toBe(false);
    act(() => setNarrow(false));
    expect(sidebar.current.collapsed).toBe(false);
    act(() => setNarrow(true));
    expect(sidebar.current.collapsed).toBe(false);
  });

  it.each(['{isto não é json', '"texto"', 'null', '{"state":{"choice":"metade"},"version":0}'])(
    'armazenamento que falha ou valor corrompido não derruba o app: %s',
    async (corrupted) => {
      localStorage.setItem('env.sidebar', corrupted);
      setNarrow(true);

      const { sidebar } = await load();

      // Como se nada estivesse salvo: vale a largura.
      expect(sidebar.current.collapsed).toBe(true);
      act(() => sidebar.current.toggle());
      expect(sidebar.current.collapsed).toBe(false);
    },
  );

  it('armazenamento bloqueado não derruba o app, e a escolha vale até recarregar', async () => {
    const blocked = () => {
      throw new DOMException('bloqueado', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    const { sidebar, useSidebarStore } = await load();
    expect(sidebar.current.collapsed).toBe(false);

    act(() => sidebar.current.toggle());

    expect(sidebar.current.collapsed).toBe(true);
    expect(() => useSidebarStore.persist.clearStorage()).not.toThrow();
  });
});
