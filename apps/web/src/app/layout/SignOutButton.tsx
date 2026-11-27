import type { ComponentProps } from 'react';
import { Button } from '../../components/ui/Button';
import { useSignOut } from '../../lib/auth';

/** Sai só neste navegador. Quem leva ao login é o guard da rota, ao ver a sessão acabar. */
export function SignOutButton({ size }: Pick<ComponentProps<typeof Button>, 'size'>) {
  const signOut = useSignOut();
  return (
    <Button variant="ghost" size={size} onClick={() => void signOut()}>
      Sair
    </Button>
  );
}
