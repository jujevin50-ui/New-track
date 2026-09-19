import { useState, useRef, useEffect, KeyboardEvent, MouseEvent } from 'react';
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
import { Send, Bot, User, Sparkles, Settings, Loader2, Plus, Trash2, History } from 'lucide-react';

interface Props {
  activeAccount: Account | null;
  accounts: Account[];
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

export default function AiAssistant({ activeAccount }: Props) {
  const initialBalance = activeAccount?.initialBalance ?? 0;
  const { trades } = useTrades(activeAccount?.id ?? null, initialBalance);
  const accountLabel = activeAccount?.name ?? 'votre compte';
  const { apiKey, setApiKey } = useAiSettings();
  const { conversations, saveConversation, deleteConversation } = useAiConversations();

  const [activeConversationId, setActiveConversationId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeWelcome(accountLabel)]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevAccountId = useRef(activeAccount?.id ?? null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Switching accounts refreshes the chat with a fresh conversation for the new account
  useEffect(() => {
    const currentId = activeAccount?.id ?? null;
    if (prevAccountId.current === currentId) return;
    prevAccountId.current = currentId;
    setActiveConversationId(crypto.randomUUID());
    setMessages([makeWelcome(accountLabel)]);
    setInput('');
  }, [activeAccount?.id, accountLabel]);

  // Persist the conversation (keeps only the 5 most recent overall)
  useEffect(() => {
    if (messages.length <= 1) return;
    const firstUser = messages.find(m => m.role === 'user');
    const title = firstUser ? firstUser.content.slice(0, 60) : 'Conversation';
    saveConversation({
      id: activeConversationId,
      accountId: activeAccount?.id ?? 'none',
      accountLabel,
      title,
      messages,
      updatedAt: new Date().toISOString(),
    });
  }, [messages, activeConversationId, activeAccount?.id, accountLabel, saveConversation]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    if (!apiKey) {
      const reply = generateAssistantResponse(content, { trades, initialBalance, accountLabel });
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
      return;
    }

    setIsLoading(true);
    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), content: m.content }));
      const systemInstruction = SYSTEM_PERSONA + buildDataContext(trades, initialBalance, accountLabel);
      const reply = await askGemini(apiKey, systemInstruction, history);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
    } catch (e) {
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
    setInput('');
  };

  const loadConversation = (conv: AiConversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
  };

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (id === activeConversationId) newConversation();
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-9rem)] max-w-6xl mx-auto">
      <div className="w-60 shrink-0 flex flex-col border border-border rounded-xl bg-card/40 overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Historique
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={newConversation} title="Nouvelle conversation">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">Aucune conversation enregistrée.</p>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                onClick={() => loadConversation(c)}
                className={`group flex items-start gap-2 rounded-lg p-2 cursor-pointer text-xs transition-colors border ${
                  c.id === activeConversationId
                    ? 'bg-primary/10 border-primary/30'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-foreground">{c.title || 'Conversation'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.accountLabel} · {formatDate(c.updatedAt)}</p>
                </div>
                <button
                  onClick={e => handleDelete(e, c.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 p-1 rounded-md -m-1"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistant IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {apiKey
                ? 'Réponses générées par Google Gemini, basées sur vos données de trading.'
                : 'Analyse locale de vos données — configurez une clé Gemini pour des réponses plus développées.'}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={openSettings} className="shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border bg-card/40 p-4">
          <div className="flex flex-col gap-4">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[90%] rounded-lg px-4 py-3 text-sm whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-3.5 py-2.5 text-sm bg-card border border-border flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyse en cours...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question, ex: fais-moi une analyse de mes datas..."
            className="h-11"
            disabled={isLoading}
          />
          <Button onClick={() => send()} size="icon" className="h-11 w-11 shrink-0" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
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
