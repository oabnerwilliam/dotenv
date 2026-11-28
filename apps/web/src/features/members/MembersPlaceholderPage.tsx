import { Users } from 'lucide-react';
import { PageHeader } from '../../app/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { TERMO_EQUIPE } from '../../lib/termos';

/** Marcador até a gestão de membros e convites existir. */
export function MembersPlaceholderPage() {
  return (
    <>
      <PageHeader path="~/equipe/membros" title="Membros" />
      <EmptyState icon={Users} title="Em breve">
        A gestão de membros e convites da {TERMO_EQUIPE} chega em breve.
      </EmptyState>
    </>
  );
}
