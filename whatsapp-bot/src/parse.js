// Parser flexivel de lancamento de gasto.
//
// Precisa de: um VALOR e uma DESCRICAO. O resto e opcional e pode vir em
// qualquer ordem / em varias linhas:
//   - quem pagou: um nome (barbara/felipe e apelidos) em qualquer posicao
//   - divisao: um token NN/NN em qualquer posicao (ex: 50/50, 100/0)
// Palavras de moeda ("reais", "real", "R$") sao ignoradas.
//
// Exemplos que funcionam:
//   45,90 ifood
//   felipe 120 farmacia
//   barbara 89,90 mercado 50/50
//   R$ 1.234,56 conserto carro
//   Barbara / Feira / 60 reais / 50/50   (multilinha)
//   60 uber felipe
//
// Retorna null quando nao ha valor ou nao ha descricao.

const BARBARA_ALIASES = ['barbara', 'bárbara', 'babi', 'barbie', 'ba'];
const FELIPE_ALIASES = ['felipe', 'felipão', 'felipao', 'fe', 'lipe'];
const CURRENCY_NOISE = new Set(['reais', 'real', 'r$', 'rs', 'pila', 'conto', 'contos']);

export function parseMoney(raw) {
  if (raw == null) return null;
  let x = String(raw).replace(/r\$/i, '').replace(/\s/g, '');
  if (!/\d/.test(x)) return null;
  // se tem "/", nao e valor (provavelmente divisao NN/NN)
  if (x.includes('/')) return null;
  if (x.includes(',') && x.includes('.')) {
    // 1.234,56 -> tira pontos de milhar, virgula vira ponto decimal
    x = x.replace(/\./g, '').replace(',', '.');
  } else if (x.includes(',')) {
    x = x.replace(',', '.');
  }
  // se so tem ".", assume decimal (padrao BR usa virgula, entao ponto = decimal)
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function parseMessage(text) {
  if (!text) return null;
  let cleaned = text.trim().replace(/\s+/g, ' ');
  // junta "R$ 1.234,56" -> "R$1.234,56" pra o valor virar um token so
  cleaned = cleaned.replace(/r\$\s+/gi, 'R$');
  if (!cleaned) return null;

  const tokens = cleaned.split(' ').filter(Boolean);
  const norm = (t) => t.toLowerCase().replace(/[.,:;!?]/g, '');

  // Mensagem comprida demais nao e lancamento de gasto (ex: templates,
  // explicacoes, conversa). Um gasto real e curto.
  if (tokens.length > 12) return null;

  let payerOverride = null;
  let splitType = null;
  let value = null;
  let moneyCount = 0;
  const descParts = [];

  for (const tok of tokens) {
    const n = norm(tok);

    // pagador (so o primeiro que aparecer)
    if (payerOverride == null && BARBARA_ALIASES.includes(n)) { payerOverride = 'barbara'; continue; }
    if (payerOverride == null && FELIPE_ALIASES.includes(n)) { payerOverride = 'felipe'; continue; }

    // divisao NN/NN (so a primeira)
    if (splitType == null && /^\d{1,3}\/\d{1,3}$/.test(tok)) { splitType = tok; continue; }

    // conta quantos tokens parecem valor
    const v = parseMoney(tok);
    if (v != null && v > 0) {
      moneyCount += 1;
      if (value == null) { value = v; continue; }
    }

    // ignora palavras de moeda
    if (CURRENCY_NOISE.has(n)) continue;

    descParts.push(tok);
  }

  if (value == null || value <= 0) return null;
  // Mais de um valor na mensagem => provavelmente nao e um unico gasto
  // (templates com varios exemplos, listas). Ignora por seguranca.
  if (moneyCount > 1) return null;
  const description = descParts.join(' ').trim();
  if (!description) return null;

  return { payerOverride, value, description, splitType };
}
