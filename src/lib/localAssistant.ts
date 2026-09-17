import { Trade, getNetResult } from '@/types/trade';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const fmtMoney = (n: number) => `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`;
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

interface Bucket { profit: number; count: number }

function groupBy<K>(trades: Trade[], keyFn: (t: Trade) => K): Map<K, Bucket> {
  const map = new Map<K, Bucket>();
  for (const t of trades) {
    const k = keyFn(t);
    const cur = map.get(k) || { profit: 0, count: 0 };
    cur.profit += getNetResult(t);
    cur.count += 1;
    map.set(k, cur);
  }
  return map;
}

function computeStats(trades: Trade[], initialBalance: number) {
  const nets = trades.map(getNetResult);
  const totalProfit = nets.reduce((a, b) => a + b, 0);
  const wins = nets.filter(n => n > 0);
  const losses = nets.filter(n => n < 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0)) / losses.length : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : (wins.length ? Infinity : 0);
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = trades.length ? (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss : 0;
  const bestTrade = nets.length ? Math.max(...nets) : 0;
  const worstTrade = nets.length ? Math.min(...nets) : 0;

  let peak = initialBalance, bal = initialBalance, maxDD = 0;
  [...trades].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    bal += getNetResult(t);
    if (bal > peak) peak = bal;
    const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  });

  const profitPercent = initialBalance > 0 ? (totalProfit / initialBalance) * 100 : 0;
  return { totalProfit, profitPercent, winRate, avgWin, avgLoss, profitFactor, avgRR, expectancy, bestTrade, worstTrade, maxDD, wins: wins.length, losses: losses.length, total: trades.length };
}

function generalSummary(trades: Trade[], initialBalance: number, accountLabel: string): string {
  const s = computeStats(trades, initialBalance);
  const verdict = s.profitFactor >= 1.5
    ? "✅ Vos statistiques sont solides, continuez sur cette voie."
    : s.profitFactor >= 1
      ? "👍 Vous êtes globalement rentable, mais il reste une marge de progression."
      : "⚠️ Votre profit factor est inférieur à 1 : vos pertes dépassent vos gains, il est temps de revoir votre gestion du risque.";

  return [
    `📊 Analyse de ${accountLabel} sur ${s.total} trade${s.total > 1 ? 's' : ''}`,
    '──────────',
    `• Résultat net : ${fmtMoney(s.totalProfit)} (${fmtPct(s.profitPercent)})`,
    `• Taux de réussite : ${s.winRate.toFixed(1)}% (${s.wins} gagnants / ${s.losses} perdants)`,
    `• Profit factor : ${s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)}`,
    `• Ratio risque/récompense moyen : ${s.avgRR.toFixed(2)}R`,
    `• Espérance par trade : ${fmtMoney(s.expectancy)}`,
    `• Meilleur trade : ${fmtMoney(s.bestTrade)} | Pire trade : ${fmtMoney(s.worstTrade)}`,
    `• Drawdown maximum : ${s.maxDD.toFixed(2)}%`,
    '──────────',
    verdict,
  ].join('\n');
}

function pairResponse(trades: Trade[], best: boolean): string {
  const map = groupBy(trades, t => t.pair);
  const entries = [...map.entries()].sort((a, b) => best ? b[1].profit - a[1].profit : a[1].profit - b[1].profit);
  if (!entries.length) return "Aucune donnée de paire disponible pour le moment.";
  const top = entries.slice(0, 3);
  const lines = top.map(([pair, d], i) => `${i + 1}. ${pair} : ${fmtMoney(d.profit)} sur ${d.count} trade${d.count > 1 ? 's' : ''}`);
  const title = best ? "🏆 Vos meilleures paires :" : "📉 Vos paires les moins performantes :";
  return [title, ...lines].join('\n');
}

function dayResponse(trades: Trade[]): string {
  const map = groupBy(trades, t => new Date(t.date).getDay());
  const entries = [...map.entries()].sort((a, b) => b[1].profit - a[1].profit);
  if (!entries.length) return "Aucune donnée disponible pour le moment.";
  const lines = entries.map(([day, d]) => `• ${DAY_NAMES[day]} : ${fmtMoney(d.profit)} (${d.count} trade${d.count > 1 ? 's' : ''})`);
  const best = entries[0];
  const worst = entries[entries.length - 1];
  return [
    "📅 Répartition de vos résultats par jour de la semaine :",
    ...lines,
    '',
    `🏆 Votre meilleur jour est ${DAY_NAMES[best[0]]} (${fmtMoney(best[1].profit)}), votre plus difficile est ${DAY_NAMES[worst[0]]} (${fmtMoney(worst[1].profit)}).`,
  ].join('\n');
}

function monthResponse(trades: Trade[]): string {
  const map = groupBy(trades, t => t.date.substring(0, 7));
  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return "Aucune donnée disponible pour le moment.";
  const lines = entries.map(([key, d]) => {
    const [y, m] = key.split('-');
    const label = `${MONTH_NAMES[Number(m) - 1]} ${y}`;
    return `• ${label} : ${fmtMoney(d.profit)} (${d.count} trade${d.count > 1 ? 's' : ''})`;
  });
  const best = [...entries].sort((a, b) => b[1].profit - a[1].profit)[0];
  const [by, bm] = best[0].split('-');
  return [
    "🗓️ Répartition de vos résultats par mois :",
    ...lines,
    '',
    `🏆 Votre meilleur mois est ${MONTH_NAMES[Number(bm) - 1]} ${by} (${fmtMoney(best[1].profit)}).`,
  ].join('\n');
}

function qualityResponse(trades: Trade[]): string {
  const lines = [1, 2, 3].map(q => {
    const qTrades = trades.filter(t => t.setupQuality === q);
    const profit = qTrades.reduce((s, t) => s + getNetResult(t), 0);
    const wins = qTrades.filter(t => getNetResult(t) > 0).length;
    const wr = qTrades.length ? (wins / qTrades.length) * 100 : 0;
    return `• ${'⭐'.repeat(q)} : ${qTrades.length} trade(s), ${fmtMoney(profit)}, taux de réussite ${wr.toFixed(0)}%`;
  });
  return ["⭐ Performance par qualité de setup :", ...lines].join('\n');
}

function exitResponse(trades: Trade[]): string {
  const map = groupBy(trades, t => t.exitType);
  const entries = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  if (!entries.length) return "Aucune donnée disponible pour le moment.";
  const lines = entries.map(([type, d]) => `• ${type} : ${d.count} trade(s), ${fmtMoney(d.profit)}`);
  return ["🚪 Répartition par type de sortie :", ...lines].join('\n');
}

function strategyResponse(trades: Trade[]): string {
  const yes = trades.filter(t => t.strategyRespected);
  const no = trades.filter(t => !t.strategyRespected);
  if (!trades.length) return "Aucune donnée disponible pour le moment.";
  const profitYes = yes.reduce((s, t) => s + getNetResult(t), 0);
  const profitNo = no.reduce((s, t) => s + getNetResult(t), 0);
  const lines = [
    `Quand vous respectez votre stratégie (${yes.length} trade${yes.length > 1 ? 's' : ''}) : ${fmtMoney(profitYes)}`,
    `Quand vous ne la respectez pas (${no.length} trade${no.length > 1 ? 's' : ''}) : ${fmtMoney(profitNo)}`,
  ];
  if (no.length > 0 && profitNo < 0) {
    lines.push('', "⚠️ Vos écarts de stratégie vous coûtent de l'argent — rester discipliné semble payant pour vous.");
  } else if (no.length === 0) {
    lines.push('', "✅ Vous avez respecté votre stratégie sur tous vos trades, bravo pour la discipline.");
  }
  return ["🎯 Discipline de stratégie :", '', ...lines].join('\n');
}

function adviceResponse(trades: Trade[], initialBalance: number): string {
  if (!trades.length) return "Aucune donnée disponible pour le moment — ajoutez quelques trades pour recevoir des conseils.";
  const s = computeStats(trades, initialBalance);
  const tips: string[] = [];

  if (s.profitFactor < 1) {
    tips.push("Votre profit factor est inférieur à 1 : vos pertes pèsent plus que vos gains. Resserrez vos stops ou soyez plus sélectif sur vos setups.");
  }
  if (s.avgRR < 1 && s.winRate > 50) {
    tips.push(`Votre ratio R:R moyen (${s.avgRR.toFixed(2)}) est faible malgré un bon taux de réussite (${s.winRate.toFixed(1)}%). Essayez de laisser courir vos gagnants plus longtemps.`);
  }
  if (s.maxDD > 15) {
    tips.push(`Votre drawdown maximum atteint ${s.maxDD.toFixed(2)}%, ce qui est élevé. Pensez à réduire votre taille de position.`);
  }
  const no = trades.filter(t => !t.strategyRespected);
  if (no.length / trades.length > 0.2) {
    tips.push(`${((no.length / trades.length) * 100).toFixed(0)}% de vos trades ne respectent pas votre stratégie. La discipline est souvent le levier le plus rapide pour progresser.`);
  }
  if (!tips.length) {
    tips.push("Vos statistiques sont globalement saines. Continuez à journaliser vos trades pour repérer les évolutions dans le temps.");
  }
  return ["💡 Quelques pistes d'amélioration :", ...tips.map(t => `• ${t}`)].join('\n');
}

function recentResponse(trades: Trade[]): string {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (!sorted.length) return "Aucun trade enregistré pour le moment.";
  const lines = sorted.map(t => {
    const net = getNetResult(t);
    return `• ${t.date} — ${t.pair} (${t.type}) : ${fmtMoney(net)} ${net >= 0 ? '✅' : '❌'}`;
  });
  return ["🕒 Vos 5 derniers trades :", ...lines].join('\n');
}

function drawdownResponse(trades: Trade[], initialBalance: number): string {
  if (!trades.length) return "Aucune donnée disponible pour le moment.";
  const s = computeStats(trades, initialBalance);
  const verdict = s.maxDD > 15
    ? "⚠️ C'est relativement élevé : surveillez votre taille de position."
    : "✅ C'est dans une fourchette raisonnable.";
  return `📉 Votre drawdown maximum sur ${s.total} trade${s.total > 1 ? 's' : ''} est de ${s.maxDD.toFixed(2)}%. ${verdict}`;
}

function winrateResponse(trades: Trade[]): string {
  if (!trades.length) return "Aucune donnée disponible pour le moment.";
  const wins = trades.filter(t => getNetResult(t) > 0).length;
  const wr = (wins / trades.length) * 100;
  return `🎯 Votre taux de réussite est de ${wr.toFixed(1)}% (${wins} gagnants sur ${trades.length} trades).`;
}

const HELP_TEXT = [
  "🤖 Je peux analyser vos trades enregistrés dans ce compte, sans connexion ni API externe. Voici ce que vous pouvez me demander :",
  "• \"Fais-moi une analyse de mes performances\"",
  "• \"Quelle est ma meilleure / pire paire ?\"",
  "• \"Quel est mon meilleur jour / mois ?\"",
  "• \"Quel est mon drawdown maximum ?\"",
  "• \"Quel est mon taux de réussite ?\"",
  "• \"Est-ce que je respecte ma stratégie ?\"",
  "• \"Performance par qualité de setup\"",
  "• \"Répartition par type de sortie\"",
  "• \"Donne-moi des conseils\"",
  "• \"Montre-moi mes derniers trades\"",
].join('\n');

export function buildDataContext(trades: Trade[], initialBalance: number, accountLabel: string): string {
  if (!trades.length) {
    return `Compte analysé : ${accountLabel}\nAucun trade enregistré pour le moment.`;
  }

  const s = computeStats(trades, initialBalance);
  const pairs = [...groupBy(trades, t => t.pair).entries()].sort((a, b) => b[1].profit - a[1].profit);
  const days = [...groupBy(trades, t => new Date(t.date).getDay()).entries()].sort((a, b) => b[1].profit - a[1].profit);
  const months = [...groupBy(trades, t => t.date.substring(0, 7)).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const exits = [...groupBy(trades, t => t.exitType).entries()];
  const strategyYes = trades.filter(t => t.strategyRespected);
  const strategyNo = trades.filter(t => !t.strategyRespected);
  const recent = [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const lines: string[] = [];
  lines.push(`Compte analysé : ${accountLabel}`);
  lines.push(`Statistiques globales (${s.total} trades) :`);
  lines.push(`- Résultat net : ${fmtMoney(s.totalProfit)} (${fmtPct(s.profitPercent)})`);
  lines.push(`- Taux de réussite : ${s.winRate.toFixed(1)}% (${s.wins} gagnants / ${s.losses} perdants)`);
  lines.push(`- Profit factor : ${s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)}`);
  lines.push(`- Ratio risque/récompense moyen : ${s.avgRR.toFixed(2)}`);
  lines.push(`- Espérance par trade : ${fmtMoney(s.expectancy)}`);
  lines.push(`- Meilleur trade : ${fmtMoney(s.bestTrade)} / Pire trade : ${fmtMoney(s.worstTrade)}`);
  lines.push(`- Drawdown maximum : ${s.maxDD.toFixed(2)}%`);

  lines.push('', 'Performance par paire :');
  pairs.forEach(([pair, d]) => lines.push(`- ${pair} : ${fmtMoney(d.profit)} (${d.count} trade${d.count > 1 ? 's' : ''})`));

  lines.push('', 'Performance par jour de la semaine :');
  days.forEach(([day, d]) => lines.push(`- ${DAY_NAMES[day]} : ${fmtMoney(d.profit)} (${d.count} trade${d.count > 1 ? 's' : ''})`));

  lines.push('', 'Performance par mois :');
  months.forEach(([key, d]) => {
    const [y, m] = key.split('-');
    lines.push(`- ${MONTH_NAMES[Number(m) - 1]} ${y} : ${fmtMoney(d.profit)} (${d.count} trade${d.count > 1 ? 's' : ''})`);
  });

  lines.push('', 'Performance par qualité de setup :');
  [1, 2, 3].forEach(q => {
    const qTrades = trades.filter(t => t.setupQuality === q);
    const profit = qTrades.reduce((sum, t) => sum + getNetResult(t), 0);
    lines.push(`- ${'⭐'.repeat(q)} : ${qTrades.length} trade(s), ${fmtMoney(profit)}`);
  });

  lines.push('', 'Répartition par type de sortie :');
  exits.forEach(([type, d]) => lines.push(`- ${type} : ${d.count} trade(s), ${fmtMoney(d.profit)}`));

  lines.push(
    '',
    `Respect de la stratégie : ${strategyYes.length} trade(s) respecté(s) (${fmtMoney(strategyYes.reduce((sum, t) => sum + getNetResult(t), 0))}), ${strategyNo.length} non respecté(s) (${fmtMoney(strategyNo.reduce((sum, t) => sum + getNetResult(t), 0))})`,
  );

  lines.push('', '10 derniers trades :');
  recent.forEach(t => {
    const notes = t.notes ? `, notes: ${t.notes}` : '';
    lines.push(`- ${t.date} ${t.pair} ${t.type} : ${fmtMoney(getNetResult(t))}, setup ${'⭐'.repeat(t.setupQuality)}, sortie ${t.exitType}, stratégie respectée: ${t.strategyRespected ? 'oui' : 'non'}${notes}`);
  });

  return lines.join('\n');
}

export interface AssistantContext {
  trades: Trade[];
  initialBalance: number;
  accountLabel: string;
}

export function generateAssistantResponse(query: string, ctx: AssistantContext): string {
  const { trades, initialBalance, accountLabel } = ctx;
  const q = normalize(query);

  if (!trades.length) {
    return "📭 Vous n'avez encore aucun trade enregistré sur ce compte. Ajoutez quelques trades dans l'onglet \"Trades\" pour que je puisse analyser vos données.";
  }

  if (/^\s*(bonjour|salut|hello|hi|coucou|yo)\b/.test(q)) {
    return "👋 Bonjour ! Demandez-moi une analyse de vos performances, de vos paires, de vos jours, ou des conseils — je réponds en me basant uniquement sur vos données locales.";
  }
  if (/aide|^help\b|que peux tu|que peux-tu|quoi faire|commandes?/.test(q)) {
    return HELP_TEXT;
  }
  if (/drawdown|\bdd\b/.test(q)) {
    return drawdownResponse(trades, initialBalance);
  }
  if (/(meilleur|meilleure|top|gagnant)[^.]*(paire|pair|actif|symbole)|(paire|pair)[^.]*(meilleur|meilleure|gagn)/.test(q)) {
    return pairResponse(trades, true);
  }
  if (/(pire|pir|perdant|moins bon|moins bonne)[^.]*(paire|pair|actif|symbole)|(paire|pair)[^.]*(pire|perd|moins bon)/.test(q)) {
    return pairResponse(trades, false);
  }
  if (/taux de reussite|win\s*rate|winrate/.test(q)) {
    return winrateResponse(trades);
  }
  if (/strateg|discipline|respect/.test(q)) {
    return strategyResponse(trades);
  }
  if (/jour|journee|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/.test(q)) {
    return dayResponse(trades);
  }
  if (/\bmois\b|mensuel/.test(q)) {
    return monthResponse(trades);
  }
  if (/setup|qualite|etoile/.test(q)) {
    return qualityResponse(trades);
  }
  if (/sortie|exit|take profit|stop loss|\btp\b|\bsl\b|\bbe\b/.test(q)) {
    return exitResponse(trades);
  }
  if (/conseil|recommand|ameliorer|astuce|tip|suggestion/.test(q)) {
    return adviceResponse(trades, initialBalance);
  }
  if (/dernier|derniere|derniers|dernieres|recent|recente/.test(q)) {
    return recentResponse(trades);
  }
  if (/analys|resum|bilan|performance|vue d'ensemble|overview|stat|bilan global|comment (je|ca|ça)/.test(q)) {
    return generalSummary(trades, initialBalance, accountLabel);
  }

  return [
    generalSummary(trades, initialBalance, accountLabel),
    '',
    "(Je n'ai pas reconnu de demande précise, voici donc un résumé général. Tapez \"aide\" pour voir ce que je peux analyser.)",
  ].join('\n');
}
