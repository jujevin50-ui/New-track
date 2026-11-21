import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { ContextEditor } from '@/components/fundamental/ContextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shiftDay } from '@/lib/discipline';
import {
  BANKS, BLOCK_TITLES, PAIRS, calendarForWeek, contextDate, currentWeek, fundamentalClient,
  weekNumber, type BlockKey, type FundamentalBlocks, type WeekContext,
} from '@/lib/fundamentalContext';

const tableName = 'fundamental_context_blocks';
const dateLabel = (day: string) => day ? contextDate.format(new Date(`${day}T00:00:00Z`)) : '—';
const addUnit = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : undefined;

function Block({ block, children, onEdit, accent = false }: {
  block: BlockKey; children: ReactNode; onEdit: (block: BlockKey) => void; accent?: boolean;
}) {
  return (
    <section aria-labelledby={`fundamental-${block}`} className={`min-w-0 rounded-xl border p-4 ${accent ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-card/30'}`}>
      <header className="mb-4 flex min-w-0 items-center justify-between gap-2">
        <h2 id={`fundamental-${block}`} className={`min-w-0 break-words text-sm font-semibold ${accent ? 'text-blue-700 dark:text-blue-300' : ''}`}>{BLOCK_TITLES[block]}</h2>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5" aria-label={`Modifier ${BLOCK_TITLES[block]}`} onClick={() => onEdit(block)}>
          <Pencil aria-hidden="true" />Modifier
        </Button>
      </header>
      {children}
    </section>
  );
}

function Details({ fields, empty = 'À renseigner' }: { fields: [string, string | undefined][]; empty?: string }) {
  if (!fields.some(([, value]) => value)) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <dl className="space-y-2 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-right">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextBlock({ value, empty }: { value?: string; empty: string }) {
  return <p className={`whitespace-pre-wrap break-words text-sm ${value ? '' : 'text-muted-foreground'}`}>{value || empty}</p>;
}

function Login({ client }: { client: SupabaseClient }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const { error } = await client.auth.signInWithPassword({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      if (error) setError('Connexion impossible. Vérifie tes identifiants et la configuration Supabase.');
    } catch {
      setError('Connexion impossible. Vérifie ton accès à Supabase.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={signIn} className="max-w-md space-y-4 rounded-xl border border-border p-5">
      <h2 className="text-base font-semibold">Se connecter à Supabase</h2>
      <label className="grid gap-1 text-sm">E-mail<Input type="email" name="email" autoComplete="email" required /></label>
      <label className="grid gap-1 text-sm">Mot de passe<Input type="password" name="password" autoComplete="current-password" required /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={busy}>Se connecter</Button>
    </form>
  );
}

function WeeklyContext({ client, userId }: { client: SupabaseClient; userId: string }) {
  const queryClient = useQueryClient();
  const [monday, setMonday] = useState(currentWeek);
  const [editing, setEditing] = useState<BlockKey | null>(null);
  const [signOutError, setSignOutError] = useState('');
  const queryKey = ['fundamental-context', userId, monday] as const;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const { data, error } = await client.from(tableName).select('block, content')
        .eq('user_id', userId).eq('week_start', monday).abortSignal(signal);
      if (error) throw error;
      return Object.fromEntries(data.map(row => [row.block, row.content])) as WeekContext;
    },
  });

  const save = async (block: BlockKey, content: FundamentalBlocks[BlockKey]) => {
    const { error } = await client.from(tableName).upsert(
      { user_id: userId, week_start: monday, block, content },
      { onConflict: 'user_id,week_start,block' },
    );
    if (error) throw error;
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData<WeekContext>(queryKey, previous => ({ ...previous, [block]: content }));
  };

  const signOut = async () => {
    setSignOutError('');
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      queryClient.removeQueries({ queryKey: ['fundamental-context', userId] });
    } catch {
      setSignOutError('Impossible de te déconnecter. Réessaie.');
    }
  };

  const events = calendarForWeek(data?.calendar ?? [], monday);
  const banks = data?.banks ?? {};

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Semaine précédente" onClick={() => setMonday(day => shiftDay(day, -7))}><ChevronLeft aria-hidden="true" /></Button>
          <p className="px-1 text-sm font-medium" aria-live="polite">{dateLabel(monday)} – {dateLabel(shiftDay(monday, 6))}</p>
          <Button variant="outline" size="icon" aria-label="Semaine suivante" onClick={() => setMonday(day => shiftDay(day, 7))}><ChevronRight aria-hidden="true" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonday(currentWeek())} disabled={monday === currentWeek()}>Cette semaine</Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>Se déconnecter</Button>
      </div>
      {signOutError && <p role="alert" className="text-sm text-destructive">{signOutError}</p>}
      {isPending ? (
        <p role="status" className="rounded-xl border border-border p-5 text-sm text-muted-foreground">Chargement du contexte…</p>
      ) : isError && !data ? (
        <div className="space-y-3 rounded-xl border border-border p-5">
          <p role="alert" className="text-sm text-destructive">Impossible de charger le contexte. Vérifie la connexion et la migration Supabase.</p>
          <Button variant="outline" onClick={() => void refetch()}>Réessayer</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Block block="regime" onEdit={setEditing}><Details fields={[[ 'Régime', data?.regime?.regime ], [ 'VIX', data?.regime?.vix ]]} /></Block>
            <Block block="dollar" onEdit={setEditing}><Details fields={[[ 'DXY', data?.dollar?.dxy ], [ 'US10Y', addUnit(data?.dollar?.us10y, '%') ], [ 'Biais Fed', data?.dollar?.fedBias ]]} /></Block>
            <Block block="week" onEdit={setEditing}>
              <p className="mb-2 text-sm font-medium">Semaine {weekNumber(monday)}</p>
              <TextBlock value={data?.week?.events} empty="Aucun événement majeur renseigné." />
            </Block>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PAIRS.map(pair => <Block key={pair} block={pair} accent onEdit={setEditing}>
              <Details fields={[
                ['Biais', data?.[pair]?.bias],
                ['Différentiel de taux', addUnit(data?.[pair]?.differential, 'pt')],
                ['Driver clé', data?.[pair]?.driver],
              ]} />
            </Block>)}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Block block="calendar" onEdit={setEditing}>
              {events.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement à impact fort renseigné pour cette semaine.</p> : (
                <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau du calendrier économique">
                  <table className="w-full border-collapse text-left text-xs">
                    <caption className="pb-3 text-left text-muted-foreground">Impact fort · heures de Paris</caption>
                    <thead>
                      <tr className="border-b border-border">
                        {['Date', 'Heure', 'Devise', 'Événement', 'Prévision', 'Précédent', 'Réel'].map(label => <th scope="col" key={label} className="whitespace-nowrap px-2 py-2 font-medium">{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(event => <tr key={event.id} className="border-b border-border">
                        <td className="whitespace-nowrap px-2 py-3">{dateLabel(event.date)}</td>
                        <td className="px-2 py-3">{event.time}</td>
                        <td className="px-2 py-3 font-medium">{event.currency}</td>
                        <td className="min-w-28 break-words px-2 py-3">{event.event}</td>
                        <td className="px-2 py-3">{event.forecast || '—'}</td>
                        <td className="px-2 py-3">{event.previous || '—'}</td>
                        <td className="px-2 py-3">{event.actual || '—'}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </Block>
            <Block block="banks" onEdit={setEditing}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {BANKS.map(bank => <div key={bank} className="min-w-0">
                  <h3 className="mb-2 text-sm font-medium">{bank}</h3>
                  <Details fields={[
                    ['Taux', addUnit(banks[bank]?.rate, '%')],
                    ['Prochaine réunion', banks[bank]?.meeting ? dateLabel(banks[bank].meeting) : undefined],
                    ['Ton / biais', banks[bank]?.tone],
                  ]} />
                </div>)}
              </div>
            </Block>
          </div>
          <Block block="notes" onEdit={setEditing}>
            <TextBlock value={data?.notes?.text} empty="Aucune note pour cette semaine." />
          </Block>
          {editing && <ContextEditor block={editing} existing={data ?? {}} monday={monday} onSave={save} onClose={() => setEditing(null)} />}
        </>
      )}
    </>
  );
}

export default function FundamentalContext() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const subscription = fundamentalClient?.auth.onAuthStateChange((_, next) => setSession(next));
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contexte fondamental</h1>
      {!fundamentalClient ? (
        <p className="max-w-lg rounded-xl border border-border p-5 text-sm text-muted-foreground">Supabase doit être configuré pour afficher et enregistrer le contexte fondamental.</p>
      ) : session === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">Vérification de la connexion…</p>
      ) : session ? (
        <WeeklyContext key={session.user.id} client={fundamentalClient} userId={session.user.id} />
      ) : <Login client={fundamentalClient} />}
    </div>
  );
}
