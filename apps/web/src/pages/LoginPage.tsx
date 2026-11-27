import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '../app/layout/AuthLayout';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { signInWithGoogle, useSession } from '../lib/auth';
import { readReturnPath } from '../lib/returnPath';
import { TERMO_EQUIPE } from '../lib/termos';

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  // `always`: sem rede o pedido deve falhar na hora, não ficar em pausa com o botão preso.
  const login = useMutation({ mutationFn: signInWithGoogle, networkMode: 'always' });
  const { reset } = login;

  // O botão Voltar pode trazer a página do cache do navegador, ainda "indo ao Google".
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [reset]);

  if (session.status === 'signed_in') return <Navigate to={readReturnPath()} replace />;

  const leaving = login.isPending || login.isSuccess;
  // O `/auth/callback` avisa pelo estado da navegação; o texto do erro na URL nunca é usado.
  const returnedWithError =
    (location.state as { loginFailed?: boolean } | null)?.loginFailed === true;
  const failed = !leaving && (login.isError || returnedWithError);

  function start() {
    if (returnedWithError) void navigate('/login', { replace: true });
    login.mutate();
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-[460px] min-w-0 flex-col gap-5 rounded-lg border border-line bg-surface-2 p-5 sm:p-7">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Entrar no .env</h1>
          <p className="text-[15px] leading-relaxed text-fg-soft">
            Acompanhe e reserve os ambientes de homologação da sua {TERMO_EQUIPE}.
          </p>
        </div>
        {failed && (
          <Banner status="bloqueado" title="Não foi possível entrar">
            O login com o Google não foi concluído. Tente de novo.
          </Banner>
        )}
        <Button variant="accent" prompt disabled={leaving} onClick={start}>
          Continuar com Google
        </Button>
        {/* Existe antes de ter texto, para o leitor de tela anunciar; vazia, não ocupa espaço. */}
        <p role="status" className="text-[13.5px] text-fg-muted empty:-mt-5">
          {leaving ? 'Abrindo o Google…' : null}
        </p>
      </div>
    </AuthLayout>
  );
}
