// O jsdom não tem `matchMedia`. Este de mentira só sabe responder uma pergunta, a única que o
// app faz: a tela é estreita? O teste muda a resposta com `setNarrow`.
let narrow = false;
const listeners = new Set<() => void>();

export function setNarrow(value: boolean) {
  narrow = value;
  listeners.forEach((listener) => listener());
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return narrow && query === '(max-width: 767.98px)';
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }) as unknown as MediaQueryList;
}
