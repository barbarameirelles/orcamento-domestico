import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('[store] Faltam SUPABASE_URL / SUPABASE_KEY no .env');
  process.exit(1);
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// Mesmos defaults do app (todas 50/50). category_rules pode sobrescrever.
const DEFAULT_RULES = {
  Moradia: '50/50',
  Alimentação: '50/50',
  Lazer: '50/50',
  Assinaturas: '50/50',
  Pets: '50/50',
  Saúde: '50/50',
  Outros: '50/50',
};

export async function getCategoryRules() {
  const rules = { ...DEFAULT_RULES };
  const { data, error } = await supabase.from('category_rules').select('*');
  if (error) {
    console.warn('[store] Nao consegui ler category_rules, usando defaults:', error.message);
    return rules;
  }
  (data || []).forEach((r) => { rules[r.key] = r.value; });
  return rules;
}

function uuid() {
  // Mesmo formato "id texto" que o app usa (coluna e text, nao uuid).
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Tenta "reservar" a mensagem na tabela wa_processed. Retorna true se conseguiu
// (mensagem inedita), false se ja foi processada antes. A PK message_id garante
// atomicidade contra duplicatas mesmo com reprocessamento do backlog offline.
async function claimMessage(messageId) {
  const { error } = await supabase
    .from('wa_processed')
    .insert({ message_id: messageId, created_at: new Date().toISOString() });
  if (!error) return true;
  if (error.code === '23505') return false; // duplicate primary key -> ja processada
  throw error;
}

async function releaseMessage(messageId) {
  await supabase.from('wa_processed').delete().eq('message_id', messageId);
}

// Insere um gasto de forma idempotente. Retorna o gasto criado, ou null se a
// mensagem ja tinha sido processada.
export async function insertExpense(messageId, expense) {
  const claimed = await claimMessage(messageId);
  if (!claimed) return null;

  const row = {
    id: uuid(),
    description: expense.description,
    payer: expense.payer,
    date: expense.date,
    value: expense.value,
    category: expense.category,
    split_type: expense.splitType,
    source: 'whatsapp',
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  const { error } = await supabase.from('expenses').insert(row);
  if (error) {
    // libera o claim pra tentar de novo numa proxima reconexao
    await releaseMessage(messageId);
    throw error;
  }
  return row;
}
