// Página só de desenvolvimento (`/dev/componentes`): todos os primitivos e seus estados.
// Não vai para o build de produção; o `scripts/check-bundle.mjs` confere isso.
import { envStatusSchema, STATUS_LABEL } from '@env/shared';
import { Lock, RefreshCw, Settings } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { EnvName } from '../../components/env/EnvName';
import { Avatar } from '../../components/ui/Avatar';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { ChipRadioGroup } from '../../components/ui/ChipRadioGroup';
import { Drawer } from '../../components/ui/Drawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { IconButton } from '../../components/ui/IconButton';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Switch } from '../../components/ui/Switch';
import { Tag } from '../../components/ui/Tag';

const STATUSES = envStatusSchema.options;
const ENV_NAMES = { livre: 'Vega', reservado: 'Hydra', uso: 'Lyra', bloqueado: 'Atlas' };

const REASONS = [
  { value: 'migracao', label: 'Migração de banco' },
  { value: 'deploy', label: 'Deploy quebrado' },
  { value: 'infra', label: 'Manutenção de infra' },
  { value: 'outro', label: 'Outro' },
];
const PURPOSES = [
  { value: 'homologacao', label: 'Homologação' },
  { value: 'demonstracao', label: 'Demonstração' },
  { value: 'investigacao', label: 'Investigação' },
];
const BRANCHES = [
  { value: 'main', label: 'main' },
  { value: 'checkout', label: 'feat/AC-1234-checkout' },
];
const DEADLINES = [
  { value: '4h', label: '4 horas' },
  { value: '1d', label: '1 dia' },
  { value: '3d', label: '3 dias' },
  { value: 'livre', label: 'Até liberar' },
];

const icon = { 'aria-hidden': true, size: 16, strokeWidth: 1.8 } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="border-b border-line pb-2 text-sm font-semibold text-fg-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      className="flex flex-wrap items-center gap-3"
    >
      {children}
    </div>
  );
}

function Buttons() {
  return (
    <Section title="Botões">
      <Row label="Botões padrão">
        <Button variant="accent" prompt>
          Salvar alterações
        </Button>
        <Button variant="green" prompt>
          Reservar
        </Button>
        <Button variant="orange">
          <Lock {...icon} />
          Bloquear
        </Button>
        <Button variant="ghost">Cancelar</Button>
      </Row>
      <Row label="Botões pequenos">
        <Button variant="accent" size="sm">
          Editar
        </Button>
        <Button variant="green" size="sm" prompt>
          Liberar
        </Button>
        <Button variant="orange" size="sm">
          Tentar de novo
        </Button>
        <Button variant="ghost" size="sm">
          Descartar
        </Button>
      </Row>
      <Row label="Botões desativados">
        <Button variant="accent" prompt disabled>
          Salvar alterações
        </Button>
        <Button variant="green" prompt disabled>
          Reservar
        </Button>
        <Button variant="orange" disabled>
          <Lock {...icon} />
          Bloquear
        </Button>
        <Button variant="ghost" disabled>
          Cancelar
        </Button>
      </Row>
      <Row label="Botões de ícone">
        <IconButton label="Sincronizar agora">
          <RefreshCw {...icon} size={18} />
        </IconButton>
        <IconButton label="Configurações" disabled>
          <Settings {...icon} size={18} />
        </IconButton>
      </Row>
    </Section>
  );
}

function Fields() {
  return (
    <Section title="Campos">
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Field label="Nome do ambiente" hint="Como aparece no board" placeholder="Vega" />
        <Field multiline label="Descrição" hint="Aparece no card do ambiente" />
        <Field
          label="Ticket"
          mono
          defaultValue="AC1234"
          hint="Chave do ticket no Jira"
          error="Use o formato AC-1234"
        />
        <Field label="Expressão do ticket" mono defaultValue="[A-Z]+-\d+" />
        <Field label="Endereço da equipe" disabled defaultValue="acme" />
        <Field multiline label="Observação" disabled defaultValue="Campo desativado" />
      </div>
    </Section>
  );
}

function Selects() {
  const [reason, setReason] = useState('migracao');
  const [branch, setBranch] = useState('main');
  const [blockReason, setBlockReason] = useState('outro');

  return (
    <Section title="Select">
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Select label="Motivo" value={reason} onValueChange={setReason} options={REASONS} />
        <Select
          label="Branch base"
          mono
          value={branch}
          onValueChange={setBranch}
          options={BRANCHES}
        />
        <Select
          label="Razão do bloqueio"
          value={blockReason}
          onValueChange={setBlockReason}
          options={REASONS}
          error="Escolha um motivo mais específico"
        />
        <Select
          label="Prazo padrão"
          value="1d"
          onValueChange={() => {}}
          options={DEADLINES}
          disabled
        />
      </div>
    </Section>
  );
}

function Choices() {
  const [validate, setValidate] = useState(true);
  const [release, setRelease] = useState(false);
  const [deadline, setDeadline] = useState('1d');

  return (
    <Section title="Switch e chips">
      <div className="flex max-w-md flex-col gap-2">
        <Switch
          label="Validar consistência de branch"
          checked={validate}
          onCheckedChange={setValidate}
        />
        <Switch label="Liberar automaticamente" checked={release} onCheckedChange={setRelease} />
        <Switch label="Regra desativada" checked onCheckedChange={() => {}} disabled />
      </div>
      <ChipRadioGroup
        label="Prazo"
        value={deadline}
        onValueChange={setDeadline}
        options={DEADLINES}
      />
      <ChipRadioGroup
        label="Prazo (desativado)"
        value="3d"
        onValueChange={() => {}}
        options={DEADLINES}
        disabled
      />
    </Section>
  );
}

function Identity() {
  return (
    <>
      <Section title="Tag">
        <Row>
          {['Interno', 'Externo', 'Base', 'Jira', 'GitHub', 'Manual'].map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Row>
      </Section>

      <Section title="Nome do ambiente">
        <Row label="Sem status">
          <EnvName name="Vega" size="lg" />
          <EnvName name="Vega" size="md" />
          <EnvName name="Vega" size="sm" />
          <EnvName name="Vega" size="inline" />
        </Row>
        {STATUSES.map((status) => (
          <Row key={status} label={STATUS_LABEL[status]}>
            <span data-status={status} className="w-24 text-sm font-semibold text-(--status)">
              {STATUS_LABEL[status]}
            </span>
            <EnvName name={ENV_NAMES[status]} size="lg" status={status} />
            <EnvName name={ENV_NAMES[status]} size="md" status={status} />
            <EnvName name={ENV_NAMES[status]} size="sm" status={status} />
            <EnvName name={ENV_NAMES[status]} size="inline" status={status} />
          </Row>
        ))}
      </Section>

      <Section title="Avatar">
        {([32, 44] as const).map((size) => (
          <Row key={size}>
            <Avatar name="Marina Teste Lima" size={size} />
            <span className="text-sm text-fg-muted">Sem status</span>
            {STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-2">
                <Avatar name="Bruno Exemplo" status={status} size={size} />
                <span className="text-sm text-fg-muted">{STATUS_LABEL[status]}</span>
              </span>
            ))}
          </Row>
        ))}
      </Section>
    </>
  );
}

function Feedback() {
  return (
    <>
      <Section title="Banner">
        {STATUSES.map((status) => (
          <Banner
            key={status}
            status={status}
            title={`Faixa de alerta: ${STATUS_LABEL[status]}`}
            actions={
              status === 'bloqueado' && (
                <>
                  <Button variant="orange" size="sm">
                    <RefreshCw {...icon} />
                    Atualizar
                  </Button>
                  <Button variant="ghost" size="sm">
                    Ver detalhes
                  </Button>
                </>
              )
            }
          >
            Mostrando os últimos dados do projeto Atlas.
          </Banner>
        ))}
      </Section>

      <Section title="Esqueleto">
        <div className="flex max-w-xs flex-col gap-3.5 rounded-md border border-line bg-surface p-4">
          <div className="flex justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-[22px] w-14" />
          </div>
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3.5 w-7/10" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </Section>

      <Section title="Estado vazio">
        <EmptyState
          command="env list --project=atlas"
          title="Nenhum ambiente ainda"
          actions={
            <>
              <Button variant="accent" prompt>
                Criar ambiente
              </Button>
              <Button variant="ghost">Ver configurações</Button>
            </>
          }
          hint="Você pode renomear os ambientes depois."
        >
          Crie o primeiro ambiente do projeto Atlas para acompanhar quem está usando.
        </EmptyState>
      </Section>
    </>
  );
}

function ReserveModal() {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState('homologacao');
  const [deadline, setDeadline] = useState('1d');

  return (
    <>
      <Button variant="green" prompt onClick={() => setOpen(true)}>
        Abrir modal
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={
          <>
            Reservar <EnvName name="Vega" size="md" />
          </>
        }
        footer={
          <>
            <Button variant="green" prompt className="flex-1" onClick={() => setOpen(false)}>
              Confirmar reserva
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-fg-soft">
          <EnvName name="Vega" size="sm" />
          <Tag>Interno</Tag>
          <span data-status="livre">
            Status: <span className="text-(--status)">{STATUS_LABEL.livre}</span>
          </span>
        </div>
        <Field
          label="Ticket (opcional)"
          placeholder="AC-1234"
          hint="Sem ticket, o ambiente fica reservado só no seu nome"
        />
        <Select
          label="Motivo da reserva"
          value={purpose}
          onValueChange={setPurpose}
          options={PURPOSES}
        />
        <ChipRadioGroup
          label="Prazo"
          value={deadline}
          onValueChange={setDeadline}
          options={DEADLINES}
        />
        <Field multiline label="Nota (opcional)" placeholder="Ex.: validando o novo relatório" />
      </Modal>
    </>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-(--status)">{title}</h3>
        <span aria-hidden="true" className="h-px flex-1 bg-(--status)/35" />
      </div>
      {children}
    </section>
  );
}

function EnvDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="accent" prompt onClick={() => setOpen(true)}>
        Abrir drawer
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        label="Ambiente Lyra"
        status="uso"
        header={
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <EnvName name="Lyra" size="lg" status="uso" />
              <Tag>Interno</Tag>
            </div>
            <p className="text-sm text-fg-muted">
              Status: <span className="font-semibold text-(--status)">{STATUS_LABEL.uso}</span> ·
              desde há 3 dias
            </p>
          </>
        }
        footer={
          <>
            <Button variant="accent" className="flex-1">
              Editar
            </Button>
            <Button variant="orange" className="flex-1">
              <Lock {...icon} />
              Bloquear
            </Button>
          </>
        }
      >
        <DrawerSection title="Ligado a">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-4 text-[15px]">
            <dt className="text-[13px] text-fg-muted">Ticket:</dt>
            <dd className="font-mono font-bold">AC-1234</dd>
            <dt className="text-[13px] text-fg-muted">Branch:</dt>
            <dd className="font-mono wrap-anywhere text-fg-soft">feat/AC-1234-checkout</dd>
          </dl>
        </DrawerSection>
        <DrawerSection title="Pessoas">
          <div className="flex items-center gap-3.5">
            <Avatar name="Marina Teste Lima" status="uso" size={44} />
            <div className="flex flex-col">
              <span className="text-[13px] text-fg-muted">Dev</span>
              <span className="text-[17px]">Marina Teste Lima</span>
            </div>
          </div>
        </DrawerSection>
      </Drawer>
    </>
  );
}

export function Vitrine() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-10 px-4 py-6 sm:px-6">
      <h1 className="font-mono text-2xl font-semibold">Vitrine de componentes</h1>
      <Section title="Modal e drawer">
        <Row>
          <ReserveModal />
          <EnvDrawer />
        </Row>
      </Section>
      <Buttons />
      <Fields />
      <Selects />
      <Choices />
      <Identity />
      <Feedback />
    </main>
  );
}
