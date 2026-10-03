import { useMemo, useState } from "react";
import { LogoSwitch } from "@/components/trading/LogoSwitch";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Landmark, Plus, Save, TrendingUp, Wallet, X, Pencil } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type Account = {
  id: string; name: string; type: string; institution: string; balance: number;
  openingBalance?: number; currency: string; archived?: boolean;
};
type Transaction = {
  id: string; date: string; description: string; amount: number;
  type: "income" | "expense"; accountId: string; category: string; notes?: string;
};
type Snapshot = {
  id: string; accountId: string; date: string; value: number;
  contributions: number; withdrawals: number; note?: string;
};
type Holding = {
  id: string; accountId: string; date: string; name: string; ticker?: string;
  quantity: number; price: number; value: number; note?: string;
};
type Subscription = {
  id: string; name: string; amount: number; frequency: "monthly"|"yearly"|"weekly";
  nextDate: string; accountId: string; category: string; active: boolean;
};
type Transfer = {
  id: string; date: string; fromAccountId: string; toAccountId: string;
  amount: number; recurring: boolean; frequency?: "monthly"|"weekly"|"yearly";
  nextDate?: string; active: boolean;
};

const TYPES = ["Compte courant","Épargne","Assurance-vie","PEA","CTO","Crypto","Espèces","Autre"];
const CATEGORIES = ["Logement","Alimentation","Transport","Abonnements","Loisirs","Shopping","Santé","Formation","Trading","Famille","Impôts","Autre"];
const INCOME_CATEGORIES = ["Salaire","Trading","Payout","Intérêts","Vente","Autre"];
const euro = (n:number) => `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
const uid = (p:string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const day = (d:string) => String(d || "").slice(0,10);

export default function Finance() {
  const { data, addRow, updateRow, deleteRow } = useData();
  const accounts = ((data as any).financeAccounts || []) as Account[];
  const transactions = ((data as any).financeTransactions || []) as Transaction[];
  const snapshots = ((data as any).financeAccountSnapshots || []) as Snapshot[];
  const holdings = ((data as any).financeHoldings || []) as Holding[];
  const subscriptions = ((data as any).financeSubscriptions || []) as Subscription[];
  const transfers = ((data as any).financeTransfers || []) as Transfer[];

  const [view,setView] = useState<"dashboard"|"accounts"|"transactions">("dashboard");
  const [selected,setSelected] = useState<Account|null>(null);
  const [accountDialog,setAccountDialog] = useState(false);
  const [txDialog,setTxDialog] = useState(false);
  const [snapshotDialog,setSnapshotDialog] = useState(false);
  const [holdingDialog,setHoldingDialog] = useState(false);
  const [editingAccount,setEditingAccount] = useState<Account|null>(null);
  const [editingTx,setEditingTx] = useState<Transaction|null>(null);
  const [accountForm,setAccountForm] = useState<Partial<Account>>({name:"",type:"Compte courant",institution:"",balance:0,currency:"EUR"});
  const [txForm,setTxForm] = useState<Transaction>({id:"",date:new Date().toISOString().slice(0,10),description:"",amount:0,type:"expense",accountId:"",category:"Autre",notes:""});
  const [snapForm,setSnapForm] = useState<Snapshot>({id:"",accountId:"",date:new Date().toISOString().slice(0,10),value:0,contributions:0,withdrawals:0,note:""});
  const [holdForm,setHoldForm] = useState<Holding>({id:"",accountId:"",date:new Date().toISOString().slice(0,10),name:"",ticker:"",quantity:0,price:0,value:0,note:""});

  const balances = useMemo(() => {
    const out:Record<string,number> = {};
    for (const a of accounts) {
      const net = transactions.filter(t=>t.accountId===a.id).reduce((s,t)=>s+(t.type==="income"?Number(t.amount):-Number(t.amount)),0);
      out[a.id] = Number(a.openingBalance ?? a.balance ?? 0) + net;
    }
    return out;
  },[accounts,transactions]);

  const total = accounts.reduce((s,a)=>s+(balances[a.id] ?? 0),0);
  const month = new Date().toISOString().slice(0,7);
  const monthTx = transactions.filter(t=>day(t.date).slice(0,7)===month);
  const income = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const expenses = monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);

  const openAccount = (a?:Account) => {
    setEditingAccount(a || null);
    setAccountForm(a ? {...a,balance:balances[a.id] ?? a.balance} : {name:"",type:"Compte courant",institution:"",balance:0,currency:"EUR"});
    setAccountDialog(true);
  };
  const saveAccount = async () => {
    if (!accountForm.name) return toast.error("Nom du compte obligatoire.");
    const current = Number(accountForm.balance || 0);
    const a = editingAccount;
    const txNet = a ? transactions.filter(t=>t.accountId===a.id).reduce((s,t)=>s+(t.type==="income"?Number(t.amount):-Number(t.amount)),0) : 0;
    const openingBalance = a ? current - txNet : current;
    const row = {...accountForm,id:a?.id || uid("acc"),balance:current,openingBalance};
    if (a) await updateRow("financeAccounts" as any,a.id,row); else await addRow("financeAccounts" as any,row);
    setAccountDialog(false); toast.success("Compte enregistré");
  };

  const openTx = (t?:Transaction) => {
    setEditingTx(t || null);
    setTxForm(t ? {...t} : {...txForm,id:"",accountId:accounts[0]?.id || "",description:"",amount:0,type:"expense",category:"Autre"});
    setTxDialog(true);
  };
  const saveTx = async () => {
    if (!txForm.description || !txForm.accountId || txForm.amount<=0) return toast.error("Complète la date, le compte, la description et le montant.");
    const row = {...txForm,id:txForm.id || uid("tx"),amount:Math.abs(Number(txForm.amount)),date:day(txForm.date)};
    if (editingTx) await updateRow("financeTransactions" as any,editingTx.id,row); else await addRow("financeTransactions" as any,row);
    setTxDialog(false); toast.success("Transaction enregistrée");
  };

  const openSnapshot = (s?:Snapshot) => {
    const a=selected!;
    setSnapForm(s ? {...s} : {id:"",accountId:a.id,date:new Date().toISOString().slice(0,10),value:balances[a.id]??0,contributions:0,withdrawals:0,note:""});
    setSnapshotDialog(true);
  };
  const saveSnapshot = async () => {
    if (!snapForm.accountId || snapForm.value<0) return toast.error("Valeur du relevé invalide.");
    const row={...snapForm,id:snapForm.id||uid("snap"),date:day(snapForm.date)};
    if (snapForm.id && snapshots.some(x=>x.id===snapForm.id)) await updateRow("financeAccountSnapshots" as any,snapForm.id,row);
    else await addRow("financeAccountSnapshots" as any,row);
    setSnapshotDialog(false); toast.success("Relevé enregistré");
  };

  const openHolding = (h?:Holding) => {
    const a=selected!;
    setHoldForm(h ? {...h} : {id:"",accountId:a.id,date:new Date().toISOString().slice(0,10),name:"",ticker:"",quantity:0,price:0,value:0,note:""});
    setHoldingDialog(true);
  };
  const saveHolding = async () => {
    if (!holdForm.name || holdForm.value<0) return toast.error("Renseigne l'actif et sa valeur.");
    const row={...holdForm,id:holdForm.id||uid("hold"),date:day(holdForm.date),value:Number(holdForm.value)};
    if (holdForm.id && holdings.some(x=>x.id===holdForm.id)) await updateRow("financeHoldings" as any,holdForm.id,row);
    else await addRow("financeHoldings" as any,row);
    setHoldingDialog(false); toast.success("Actif enregistré");
  };

  return <div className="min-h-screen bg-background text-foreground -mx-4 md:-mx-6 -mb-4 md:-mb-6">
    <LogoSwitch floating />
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="max-w-[1500px] mx-auto px-5 py-4 flex items-center justify-between pl-24">
        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-emerald-400"/></div><div><p className="font-semibold">My Finance</p><p className="text-[11px] text-muted-foreground">Patrimoine · comptes · investissements · dépenses</p></div></div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={()=>openTx()}><Plus className="h-4 w-4 mr-1"/>Transaction</Button>
      </div>
      <div className="max-w-[1500px] mx-auto px-5 pl-24 flex gap-1">
        {([["dashboard","Vue d’ensemble"],["accounts","Comptes"],["transactions","Transactions"]] as const).map(([v,l])=><button key={v} onClick={()=>setView(v)} className={`px-4 py-3 text-xs border-b-2 ${view===v?"text-emerald-400 border-emerald-400":"text-muted-foreground border-transparent"}`}>{l}</button>)}
      </div>
    </header>

    <main className="max-w-[1500px] mx-auto p-5 space-y-5">
      {view==="dashboard" && <Dashboard total={total} income={income} expenses={expenses} accounts={accounts} balances={balances} />}
      {view==="transactions" && <Transactions transactions={transactions} accounts={accounts} onAdd={()=>openTx()} onEdit={openTx} onDelete={async t=>{await deleteRow("financeTransactions" as any,t.id);toast.success("Transaction supprimée")}} />}
      {view==="accounts" && !selected && <div className="space-y-4">
        <Header title="Comptes & patrimoine" subtitle="Clique sur un compte pour suivre son évolution dans le temps" action={<Button size="sm" onClick={()=>openAccount()}><Plus className="h-4 w-4 mr-1"/>Nouveau compte</Button>}/>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{accounts.map(a=><div key={a.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><Landmark className="h-5 w-5 text-sky-400"/></div><div><p className="font-semibold text-sm">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.type} · {a.institution||"—"}</p></div></div><div className="flex gap-1"><button className="p-1.5" onClick={()=>openAccount(a)}><Pencil className="h-3.5 w-3.5"/></button><button className="p-1.5 text-rose-400" onClick={async()=>{await deleteRow("financeAccounts" as any,a.id)}}><X className="h-3.5 w-3.5"/></button></div></div>
          <button className="text-left w-full mt-5" onClick={()=>setSelected(a)}><p className="font-mono text-2xl font-bold">{euro(balances[a.id]??0)}</p><p className="text-[10px] text-muted-foreground mt-1">Voir l’évolution et les relevés →</p></button>
        </div>)}</div>
      </div>}

      {view==="accounts" && selected && <AccountDetail account={selected} balance={balances[selected.id]??0} snapshots={snapshots.filter(s=>s.accountId===selected.id)} holdings={holdings.filter(h=>h.accountId===selected.id)} onBack={()=>setSelected(null)} onSnapshot={openSnapshot} onHolding={openHolding} onDeleteSnapshot={async s=>{await deleteRow("financeAccountSnapshots" as any,s.id);toast.success("Relevé supprimé")}} onDeleteHolding={async h=>{await deleteRow("financeHoldings" as any,h.id);toast.success("Actif supprimé")}} />}
    </main>

    <Dialog open={accountDialog} onOpenChange={setAccountDialog}><DialogContent><DialogHeader><DialogTitle>{editingAccount?"Modifier le compte":"Nouveau compte"}</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div><Label>Nom</Label><Input value={accountForm.name||""} onChange={e=>setAccountForm(x=>({...x,name:e.target.value}))}/></div><div><Label>Banque / établissement</Label><Input value={accountForm.institution||""} onChange={e=>setAccountForm(x=>({...x,institution:e.target.value}))}/></div></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={accountForm.type as string} onValueChange={v=>setAccountForm(x=>({...x,type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{TYPES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Solde actuel</Label><Input type="number" value={accountForm.balance as number || ""} onChange={e=>setAccountForm(x=>({...x,balance:Number(e.target.value)}))}/></div></div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={saveAccount}>Enregistrer</Button>
    </div></DialogContent></Dialog>

    <Dialog open={txDialog} onOpenChange={setTxDialog}><DialogContent><DialogHeader><DialogTitle>{editingTx?"Modifier la transaction":"Nouvelle transaction"}</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div><Label>Date</Label><Input type="date" value={txForm.date} onChange={e=>setTxForm(x=>({...x,date:e.target.value}))}/></div><div><Label>Montant</Label><Input type="number" value={txForm.amount||""} onChange={e=>setTxForm(x=>({...x,amount:Number(e.target.value)}))}/></div></div>
      <div><Label>Description</Label><Input value={txForm.description} onChange={e=>setTxForm(x=>({...x,description:e.target.value}))}/></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Compte</Label><Select value={txForm.accountId} onValueChange={v=>setTxForm(x=>({...x,accountId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Type</Label><Select value={txForm.type} onValueChange={(v:any)=>setTxForm(x=>({...x,type:v,category:"Autre"}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="expense">Dépense</SelectItem><SelectItem value="income">Revenu</SelectItem></SelectContent></Select></div></div>
      <div><Label>Catégorie</Label><Select value={txForm.category} onValueChange={v=>setTxForm(x=>({...x,category:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(txForm.type==="expense"?CATEGORIES:INCOME_CATEGORIES).map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={saveTx}><Save className="h-4 w-4 mr-2"/>Enregistrer</Button>
    </div></DialogContent></Dialog>

    <Dialog open={snapshotDialog} onOpenChange={setSnapshotDialog}><DialogContent><DialogHeader><DialogTitle>Relevé du compte</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div><Label>Date du relevé</Label><Input type="date" value={snapForm.date} onChange={e=>setSnapForm(x=>({...x,date:e.target.value}))}/></div><div><Label>Valeur totale</Label><Input type="number" value={snapForm.value||""} onChange={e=>setSnapForm(x=>({...x,value:Number(e.target.value)}))}/></div></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Versements</Label><Input type="number" value={snapForm.contributions||""} onChange={e=>setSnapForm(x=>({...x,contributions:Number(e.target.value)}))}/></div><div><Label>Retraits</Label><Input type="number" value={snapForm.withdrawals||""} onChange={e=>setSnapForm(x=>({...x,withdrawals:Number(e.target.value)}))}/></div></div>
      <div><Label>Note</Label><Input value={snapForm.note||""} onChange={e=>setSnapForm(x=>({...x,note:e.target.value}))} placeholder="Marché, arbitrage, commentaire…"/></div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={saveSnapshot}>Enregistrer le relevé</Button>
    </div></DialogContent></Dialog>

    <Dialog open={holdingDialog} onOpenChange={setHoldingDialog}><DialogContent><DialogHeader><DialogTitle>Actif du relevé</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div><Label>Actif</Label><Input value={holdForm.name} onChange={e=>setHoldForm(x=>({...x,name:e.target.value}))} placeholder="ETF MSCI World"/></div><div><Label>Ticker</Label><Input value={holdForm.ticker||""} onChange={e=>setHoldForm(x=>({...x,ticker:e.target.value.toUpperCase()}))}/></div></div>
      <div className="grid grid-cols-3 gap-3"><div><Label>Quantité</Label><Input type="number" value={holdForm.quantity||""} onChange={e=>{const q=Number(e.target.value);setHoldForm(x=>({...x,quantity:q,value:q*x.price}))}}/></div><div><Label>Prix unitaire</Label><Input type="number" value={holdForm.price||""} onChange={e=>{const p=Number(e.target.value);setHoldForm(x=>({...x,price:p,value:x.quantity*p}))}}/></div><div><Label>Valeur</Label><Input type="number" value={holdForm.value||""} onChange={e=>setHoldForm(x=>({...x,value:Number(e.target.value)}))}/></div></div>
      <div><Label>Date du relevé</Label><Input type="date" value={holdForm.date} onChange={e=>setHoldForm(x=>({...x,date:e.target.value}))}/></div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={saveHolding}>Enregistrer l’actif</Button>
    </div></DialogContent></Dialog>
  </div>;
}

function Dashboard({total,income,expenses,accounts,balances}:{total:number;income:number;expenses:number;accounts:Account[];balances:Record<string,number>}) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric title="Patrimoine suivi" value={euro(total)} tone="text-sky-400"/><Metric title="Revenus du mois" value={euro(income)} tone="text-emerald-400"/><Metric title="Dépenses du mois" value={euro(expenses)} tone="text-rose-400"/><Metric title="Cash-flow" value={euro(income-expenses)} tone={income-expenses>=0?"text-emerald-400":"text-rose-400"}/></div>
    <div className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold mb-1">Comptes</h2><p className="text-[10px] text-muted-foreground mb-4">Solde actuel calculé automatiquement à partir des transactions.</p><div className="space-y-2">{accounts.map(a=><div key={a.id} className="flex justify-between text-xs border-b border-border/40 py-2"><span>{a.name}</span><span className="font-mono">{euro(balances[a.id]??0)}</span></div>)}</div></div>
  </div>;
}

function AccountDetail({account,balance,snapshots,holdings,onBack,onSnapshot,onHolding,onDeleteSnapshot,onDeleteHolding}:{account:Account;balance:number;snapshots:Snapshot[];holdings:Holding[];onBack:()=>void;onSnapshot:(s?:Snapshot)=>void;onHolding:(h?:Holding)=>void;onDeleteSnapshot:(s:Snapshot)=>void;onDeleteHolding:(h:Holding)=>void}) {
  const ordered=[...snapshots].sort((a,b)=>a.date.localeCompare(b.date));
  const chart=ordered.map(s=>({date:s.date,value:s.value}));
  const latest=ordered[ordered.length-1];
  const previous=ordered[ordered.length-2];
  const netChange=latest ? latest.value - (previous?.value ?? (account.openingBalance ?? account.balance)) - Number(latest.contributions||0) + Number(latest.withdrawals||0) : 0;
  const base=previous?.value ?? (account.openingBalance ?? account.balance);
  const pct=base ? netChange/base*100 : 0;
  const latestHoldings=latest ? holdings.filter(h=>h.date===latest.date) : [];

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1"/>Comptes</Button><div><h1 className="text-xl font-bold">{account.name}</h1><p className="text-xs text-muted-foreground">{account.type} · {account.institution||"—"}</p></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>onHolding()}><Plus className="h-4 w-4 mr-1"/>Actif</Button><Button size="sm" onClick={()=>onSnapshot()}><Plus className="h-4 w-4 mr-1"/>Relevé</Button></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric title="Valeur actuelle" value={euro(balance)} tone="text-sky-400"/><Metric title="Dernier relevé" value={latest?euro(latest.value):"—"} tone="text-violet-400"/><Metric title="Performance" value={latest?euro(netChange):"—"} tone={netChange>=0?"text-emerald-400":"text-rose-400"}/><Metric title="Performance %" value={latest?`${pct.toFixed(2)} %`:"—"} tone={pct>=0?"text-emerald-400":"text-rose-400"}/></div>
    <div className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Évolution du compte</h2><p className="text-[10px] text-muted-foreground mb-3">Ajoute un relevé à chaque fin de mois pour construire ton historique.</p><div className="h-[300px]">{chart.length>1?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" opacity={.25}/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${Math.round(v)}€`}/><Tooltip formatter={(v:number)=>euro(v)}/><Area type="monotone" dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={.12}/></AreaChart></ResponsiveContainer>:<Empty text="Ajoute au moins deux relevés pour afficher le graphique."/>}</div></div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Historique des relevés" subtitle="Valeur, versements, retraits et note">{ordered.length?ordered.slice().reverse().map(s=><div key={s.id} className="flex items-center justify-between gap-3 p-3 border-b border-border/40"><div><p className="text-xs font-medium">{s.date}</p><p className="text-[10px] text-muted-foreground">Versements {euro(s.contributions)} · Retraits {euro(s.withdrawals)}{s.note?` · ${s.note}`:""}</p></div><div className="flex items-center gap-2"><b className="font-mono text-xs">{euro(s.value)}</b><button onClick={()=>onSnapshot(s)}><Pencil className="h-3 w-3"/></button><button onClick={()=>onDeleteSnapshot(s)} className="text-rose-400"><X className="h-3 w-3"/></button></div></div>):<Empty text="Aucun relevé."/>}</Card>
      <Card title="Actifs du dernier relevé" subtitle="Quantité × prix = valeur à la date du relevé">{latestHoldings.length?latestHoldings.map(h=><div key={h.id} className="flex justify-between gap-3 p-3 border-b border-border/40"><div><p className="text-xs font-medium">{h.name}{h.ticker?` · ${h.ticker}`:""}</p><p className="text-[10px] text-muted-foreground">{h.quantity} × {euro(h.price)}</p></div><div className="flex items-center gap-2"><b className="font-mono text-xs">{euro(h.value)}</b><button onClick={()=>onHolding(h)}><Pencil className="h-3 w-3"/></button><button onClick={()=>onDeleteHolding(h)} className="text-rose-400"><X className="h-3 w-3"/></button></div></div>):<Empty text="Aucun actif sur le dernier relevé."/>}</Card>
    </div>
  </div>;
}

function Transactions({transactions,accounts,onAdd,onEdit,onDelete}:{transactions:Transaction[];accounts:Account[];onAdd:()=>void;onEdit:(t:Transaction)=>void;onDelete:(t:Transaction)=>void}) {
  const [q,setQ]=useState("");
  const list=transactions.filter(t=>!q||t.description.toLowerCase().includes(q.toLowerCase())||t.category.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>day(b.date).localeCompare(day(a.date)));
  return <div className="space-y-4"><Header title="Transactions" subtitle={`${transactions.length} opérations · les soldes sont recalculés automatiquement`} action={<Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1"/>Ajouter</Button>}/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher…"/><div className="rounded-2xl border border-border overflow-hidden">{list.map(t=><div key={t.id} className="grid grid-cols-[100px_1fr_130px_130px_130px] gap-3 items-center p-3 border-b border-border/40 text-xs"><span>{day(t.date)}</span><span className="font-medium truncate">{t.description}</span><span>{t.category}</span><span>{accounts.find(a=>a.id===t.accountId)?.name||"—"}</span><span className={`text-right font-mono ${t.type==="income"?"text-emerald-400":"text-rose-400"}`}>{t.type==="income"?"+":"-"}{euro(t.amount)} <button onClick={()=>onEdit(t)} className="ml-2 underline">Modifier</button> <button onClick={()=>onDelete(t)} className="ml-1 text-rose-400">×</button></span></div>)}{!list.length&&<Empty text="Aucune transaction."/>}</div></div>;
}

function Metric({title,value,tone}:{title:string;value:string;tone:string}){return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">{title}</p><p className={`font-mono text-lg font-bold mt-3 ${tone}`}>{value}</p></div>}
function Card({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){return <section className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">{title}</h2>{subtitle&&<p className="text-[10px] text-muted-foreground mb-3">{subtitle}</p>}<div className="mt-2">{children}</div></section>}
function Header({title,subtitle,action}:{title:string;subtitle:string;action:React.ReactNode}){return <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">{title}</h1><p className="text-xs text-muted-foreground mt-1">{subtitle}</p></div>{action}</div>}
function Empty({text}:{text:string}){return <div className="p-8 text-center text-xs text-muted-foreground">{text}</div>}
