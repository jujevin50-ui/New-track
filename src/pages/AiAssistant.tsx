import { dashboardAnalytics } from '@/lib/dashboardAnalytics';
import { localDay } from '@/lib/discipline';
import DashboardFilter from '@/components/trading/DashboardFilter';
import { accountScope } from '@/lib/accountScope';
import { useState, useRef, useEffect, useMemo, KeyboardEvent, MouseEvent } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { useAiSettings } from '@/hooks/useAiSettings';
import { useAiConversations, ChatMessage, AiConversation } from '@/hooks/useAiConversations';
import { Account } from '@/types/account';
import { generateAssistantResponse, buildDataContext } from '@/lib/localAssistant';
import { askGemini } from '@/lib/geminiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Settings, Loader2, Plus, Trash2 } from 'lucide-react';

interface Props {
  activeAccount: Account | null;
  accounts: Account[];
  onSelectAccount: (id:string)=>void;
}

const SUGGESTIONS = [
  'Fais-moi une analyse de mes performances',
  'Quelle est ma meilleure paire ?',
  'Quel est mon drawdown maximum ?',
  "Donne-moi des conseils pour m'améliorer",
  'Montre-moi mes derniers trades',
];

const SYSTEM_PERSONA = `Tu es l'assistant IA intégré au journal de trading personnel de l'utilisateur. Réponds toujours en français, avec un ton de coach de trading direct, motivant mais honnête. Développe tes réponses (plusieurs phrases ou un court paragraphe structuré), varie ta formulation d'un message à l'autre, et appuie-toi UNIQUEMENT sur les données ci-dessous — n'invente jamais de chiffres qui n'y figurent pas. Utilise quelques émojis pertinents (📈📉💰🎯🏆⚠️✅💡 etc.) pour rythmer ta réponse, sans en abuser.

Structure tes réponses pour qu'elles soient claires à lire en texte brut (PAS de markdown comme ** ou ##, ce n'est pas supporté) :
- Découpe la réponse en sections courtes, chacune avec un titre précédé d'un émoji (ex: "📊 Résumé", "🏆 Points forts", "⚠️ Points d'attention", "💡 Conseils").
- Sépare chaque section par une ligne de séparation faite de tirets, par exemple : ──────────
- À l'intérieur d'une section, utilise des puces "•" pour lister les points, une par ligne.
- Termine si pertinent par une courte conclusion ou question ouverte.

Si la question sort du cadre du trading ou de ce journal, réponds brièvement (sans cette structure) que tu es spécialisé dans l'analyse de ce journal.\n\n`;

const makeWelcome = (label: string): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: `Bonjour ! Je suis votre assistant d'analyse pour ${label}. Posez-moi une question, par exemple "fais-moi une analyse de mes datas".`,
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AiAssistant({ activeAccount, accounts, onSelectAccount }: Props) {
  const [preferredCurrency,setPreferredCurrency] = useState('');
  const scope = useMemo(()=>accountScope(accounts,activeAccount?.id ?? 'all',preferredCurrency || activeAccount?.currency || accounts[0]?.currency),[accounts,activeAccount?.id,activeAccount?.currency,preferredCurrency]);
  const initialBalance = scope.capital;
  const { allTrades } = useTrades(activeAccount?.id ?? null, initialBalance);
  const trades = dashboardAnalytics(allTrades,{accountIds:scope.accounts.map(account=>account.id),to:localDay(),startingCapital:scope.capital}).closedTrades;
  const accountLabel = activeAccount?.id === 'all' ? `Tous les comptes${scope.currency ? ` · ${scope.currency}` : ''}` : activeAccount?.name ?? 'votre compte';
  const scopeKey = `${activeAccount?.id}:${scope.currency}`;
  const liveScope = useRef(scopeKey);
  liveScope.current = scopeKey;
  const { apiKey, setApiKey } = useAiSettings();
  const { conversations, saveConversation, deleteConversation } = useAiConversations();

  const [activeConversationId, setActiveConversationId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeWelcome(accountLabel)]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScope = useRef(scopeKey);
  const pendingConversation = useRef<AiConversation | null>(null);
  const [conversationScope,setConversationScope] = useState(scopeKey);
  const [historyQuery,setHistoryQuery] = useState('');

  useEffect(() => {
    const viewport = bottomRef.current?.closest<HTMLElement>('[data-radix-scroll-area-viewport]');
    viewport?.scrollTo({top:viewport.scrollHeight, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }, [messages, isLoading]);

  useEffect(() => {
    if(prevScope.current===scopeKey) return;
    prevScope.current=scopeKey;
    const pending=pendingConversation.current;
    pendingConversation.current=null;
    setConversationScope(scopeKey);
    if(pending && pending.accountId===activeAccount?.id) {setActiveConversationId(pending.id);setMessages(pending.messages);} else {setActiveConversationId(crypto.randomUUID());setMessages([makeWelcome(accountLabel)]);}
    setInput('');
  },[scopeKey,activeAccount?.id,accountLabel]);

  // Persist the conversation (keeps only the 5 most recent overall)
  useEffect(() => {
    if (messages.length <= 1 || conversationScope !== scopeKey) return;
    const firstUser = messages.find(m => m.role === 'user');
    const title = firstUser ? firstUser.content.slice(0, 60) : 'Conversation';
    saveConversation({
      id: activeConversationId,
      accountId: activeAccount?.id ?? 'none',
      accountLabel,
      currency:scope.currency,
      title,
      messages,
      updatedAt: new Date().toISOString(),
    });
  }, [messages, activeConversationId, activeAccount?.id, accountLabel, saveConversation, scope.currency, conversationScope, scopeKey]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading || !scope.accounts.length) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    if (!apiKey) {
      const reply = generateAssistantResponse(content, { trades, initialBalance, accountLabel });
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
      return;
    }

    setIsLoading(true);
    const requestScope=scopeKey;
    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), content: m.content }));
      const systemInstruction = SYSTEM_PERSONA + buildDataContext(trades, initialBalance, accountLabel);
      const reply = await askGemini(apiKey, systemInstruction, history);
      if(liveScope.current !== requestScope) return;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
    } catch (e) {
      if(liveScope.current !== requestScope) return;
      const fallback = generateAssistantResponse(content, { trades, initialBalance, accountLabel });
      const message = e instanceof Error ? e.message : 'inconnue';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Erreur IA (${message}) — voici une réponse locale de secours :\n\n${fallback}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
  };

  const openSettings = () => {
    setKeyInput(apiKey);
    setSettingsOpen(true);
  };

  const saveKey = () => {
    setApiKey(keyInput);
    setSettingsOpen(false);
  };

  const newConversation = () => {
    setActiveConversationId(crypto.randomUUID());
    setMessages([makeWelcome(accountLabel)]);
    setConversationScope(scopeKey);
    setInput('');
  };

  const loadConversation = (conv: AiConversation) => {
    if(isLoading) return;
    const known=conv.accountId==='all' || accounts.some(account=>account.id===conv.accountId);
    if(known && (conv.accountId!==activeAccount?.id || conv.currency && conv.currency!==scope.currency)) {
      pendingConversation.current=conv;
      setPreferredCurrency(conv.currency ?? '');
      onSelectAccount(conv.accountId);
      return;
    }
    setConversationScope(scopeKey);
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
  };

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (id === activeConversationId) newConversation();
  };

  const history = conversations.filter(conversation => (activeAccount?.id==='all' || conversation.accountId===activeAccount?.id) && `${conversation.title} ${conversation.accountLabel}`.toLocaleLowerCase('fr-FR').includes(historyQuery.trim().toLocaleLowerCase('fr-FR')));
  return (
    <div className="assistant-page w-full space-y-8 pb-10">
      <header className="flex flex-wrap items-center justify-end gap-4"><h1 className="sr-only page-title-hidden">Assistant IA</h1><div className="flex items-center gap-2"><Button variant="outline" aria-label="Paramètres de l’assistant" onClick={openSettings} className="h-10 rounded-[10px]"><Settings className="h-4 w-4"/></Button><Button disabled={isLoading} onClick={newConversation} className="h-10 gap-2 rounded-[10px] text-xs"><Plus className="h-4 w-4"/>Nouvelle conversation</Button></div></header>
      <div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte de l’assistant" value={activeAccount?.id ?? 'all'} onChange={onSelectAccount} disabled={isLoading} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account=>({value:account.id,label:account.name}))]}/>{scope.groups.length>1 && <DashboardFilter label="Devise" ariaLabel="Devise de l’assistant" value={scope.currency || 'UNKNOWN'} onChange={setPreferredCurrency} disabled={isLoading} options={scope.groups.map(group=>({value:group.currency,label:group.currency}))}/>}<p className="self-end pb-3 text-[11px] text-muted-foreground">{apiKey ? 'Gemini' : 'Analyse locale'} · Trades clôturés</p></div>
      {!scope.accounts.length && <p className="text-sm text-muted-foreground">{accounts.length ? 'Choisis un compte dont la devise est renseignée.' : 'Ajoute un compte pour commencer.'}</p>}
      <div className="assistant-layout ui-reading-divider grid min-w-0 items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4" aria-label="Historique des conversations"><h2 className="text-sm font-semibold">Conversations</h2><Input aria-label="Rechercher une conversation" placeholder="Rechercher…" value={historyQuery} onChange={event=>setHistoryQuery(event.target.value)} className="h-10 rounded-[10px] bg-transparent text-xs"/><div className="reports-period-list">{history.length ? history.map(conversation=><div key={conversation.id} className={`assistant-history-item flex items-start gap-2 rounded-[10px] px-3 py-4 ${conversation.id===activeConversationId ? 'bg-primary/10' : 'hover:bg-secondary/40'}`}><button disabled={isLoading} onClick={()=>loadConversation(conversation)} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-medium">{conversation.title || 'Conversation'}</span><span className="mt-2 block text-[10px] text-muted-foreground">{conversation.accountLabel} · {formatDate(conversation.updatedAt)}</span></button><button disabled={isLoading} onClick={event=>handleDelete(event,conversation.id)} aria-label={`Supprimer la conversation ${conversation.title}`} className="shrink-0 rounded p-1 text-muted-foreground hover:text-loss"><Trash2 className="h-3.5 w-3.5"/></button></div>) : <p className="py-8 text-center text-xs text-muted-foreground">Aucune conversation dans cette sélection.</p>}</div></aside>
        <section className="assistant-chat flex min-w-0 flex-col" aria-label="Conversation avec l’assistant"><ScrollArea className="min-h-0 flex-1"><div className="flex flex-col gap-6 pr-4">{messages.map(message=><div key={message.id} className={`flex ${message.role==='user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl text-sm leading-7 ${message.role==='user' ? 'bg-secondary/60 px-4 py-3' : 'py-2'}`}>{message.content}</div></div>)}{isLoading && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Analyse en cours…</p>}<div ref={bottomRef}/></div></ScrollArea>
          {messages.length<=1 && <div className="mt-5 flex flex-wrap gap-2">{SUGGESTIONS.slice(0,3).map(suggestion=><button disabled={isLoading || !scope.accounts.length} key={suggestion} onClick={()=>send(suggestion)} className="rounded-[10px] bg-secondary/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary">{suggestion}</button>)}</div>}
          <div className="mt-5 flex items-center gap-2"><Input aria-label="Message à l’assistant" value={input} onChange={event=>setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Pose ta question…" className="h-11 rounded-[10px] bg-transparent text-sm" disabled={isLoading || !scope.accounts.length}/><Button onClick={()=>send()} aria-label="Envoyer le message" className="h-11 w-11 shrink-0 rounded-[10px]" disabled={!input.trim() || isLoading || !scope.accounts.length}><Send className="h-4 w-4"/></Button></div>
        </section>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer l'IA (Google Gemini)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crée une clé API gratuite sur{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary underline">
                aistudio.google.com/apikey
              </a>
              , puis colle-la ci-dessous. Elle est stockée uniquement sur cet appareil (localStorage) et utilisée pour appeler l'API Gemini directement depuis le navigateur. Sans clé, l'assistant utilise une analyse locale plus basique.
            </p>
            <Input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <div className="flex justify-end gap-2">
              {apiKey && (
                <Button variant="outline" onClick={() => { setApiKey(''); setKeyInput(''); setSettingsOpen(false); }}>
                  Supprimer la clé
                </Button>
              )}
              <Button onClick={saveKey} disabled={!keyInput.trim()}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
