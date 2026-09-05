import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

import { parseMessage } from './parse.js';
import { inferCategory } from './inferCategory.js';
import { getCategoryRules, insertExpense } from './store.js';

// ── Trava de instancia unica ──────────────────────────────────────────────────
// Impede rodar dois bots ao mesmo tempo (que causa o loop "code 440").
const LOCK_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'bot.lock');
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = parseInt(readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (pid && pidAlive(pid)) {
      console.error(`[bot] Ja existe um bot rodando (PID ${pid}). Encerre-o antes de abrir outro (evita o loop code 440). Saindo.`);
      process.exit(1);
    }
    // lock orfao de um processo morto -> sobrescreve
  }
  writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE) && readFileSync(LOCK_FILE, 'utf8').trim() === String(process.pid)) {
      unlinkSync(LOCK_FILE);
    }
  } catch { /* ignore */ }
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

acquireLock();

const GROUP_NAME = (process.env.GROUP_NAME || '').trim();
const DEFAULT_PAYER = (process.env.DEFAULT_PAYER || 'barbara').trim();
const TZ = process.env.TZ || 'America/Sao_Paulo';
const REPLY = (process.env.REPLY_CONFIRMATION || 'true') === 'true';
const IGNORE_OLDER_THAN_DAYS = Number(process.env.IGNORE_OLDER_THAN_DAYS || 14);

const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const last8 = (s) => onlyDigits(s).slice(-8);

const WA_BARBARA = last8(process.env.WA_BARBARA);
const WA_FELIPE = last8(process.env.WA_FELIPE);

if (!GROUP_NAME) {
  console.error('[bot] Defina GROUP_NAME no .env');
  process.exit(1);
}

let groupJid = null;
let categoryRules = {};

function ymdFromUnix(seconds) {
  const ms = (Number(seconds) || Date.now() / 1000) * 1000;
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function fmtBRL(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function resolvePayer(senderJid) {
  const l8 = last8(senderJid);
  if (WA_BARBARA && l8 === WA_BARBARA) return 'barbara';
  if (WA_FELIPE && l8 === WA_FELIPE) return 'felipe';
  return DEFAULT_PAYER;
}

function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

async function start() {
  categoryRules = await getCategoryRules();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n[bot] Escaneie o QR code abaixo no WhatsApp:');
      console.log('      (Aparelhos conectados -> Conectar um aparelho)\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('[bot] Conectado ao WhatsApp.');
      try {
        const groups = await sock.groupFetchAllParticipating();
        const list = Object.values(groups);
        const match = list.find(
          (g) => (g.subject || '').trim().toLowerCase() === GROUP_NAME.toLowerCase()
        );
        if (match) {
          groupJid = match.id;
          console.log(`[bot] Ouvindo o grupo "${match.subject}" (${groupJid})`);
        } else {
          groupJid = null;
          console.warn(`[bot] Grupo "${GROUP_NAME}" nao encontrado. Grupos disponiveis:`);
          list.forEach((g) => console.warn('       -', g.subject));
        }
      } catch (e) {
        console.error('[bot] Erro ao listar grupos:', e.message);
      }
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.warn(`[bot] Conexao fechada (code ${code}).`, loggedOut ? 'Deslogado.' : 'Reconectando...');
      if (loggedOut) {
        console.error('[bot] Sessao encerrada. Apague a pasta auth_info/ e rode de novo pra reescanear o QR.');
        process.exit(1);
      } else {
        start().catch((e) => console.error('[bot] Falha ao reconectar:', e));
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (e) {
        console.error('[bot] Erro ao processar mensagem:', e.message);
      }
    }
  });
}

async function handleMessage(sock, msg) {
  if (!msg.message) return;
  const remoteJid = msg.key.remoteJid;

  // so o grupo alvo
  if (!groupJid || remoteJid !== groupJid) return;

  // ignora status/broadcast
  if (remoteJid === 'status@broadcast') return;

  // ignora mensagens antigas demais (evita replay de historico profundo)
  const ts = Number(msg.messageTimestamp) || 0;
  if (ts) {
    const ageDays = (Date.now() / 1000 - ts) / 86400;
    if (ageDays > IGNORE_OLDER_THAN_DAYS) return;
  }

  const text = extractText(msg);
  // ignora as proprias confirmacoes do bot (chegam como fromMe e criariam loop)
  if (text.trim().startsWith('✅')) return;
  const parsed = parseMessage(text);
  if (!parsed) return; // nao e um lancamento de gasto

  const senderJid = msg.key.fromMe
    ? (sock.user?.id || '')
    : (msg.key.participant || remoteJid);
  const payer = parsed.payerOverride || resolvePayer(senderJid);

  const category = inferCategory(parsed.description);
  const splitType = parsed.splitType || categoryRules[category] || '50/50';
  const date = ymdFromUnix(ts);

  const expense = {
    description: parsed.description,
    payer,
    date,
    value: parsed.value,
    category,
    splitType,
  };

  const created = await insertExpense(msg.key.id, expense);
  if (!created) return; // ja processada antes (dedup)

  console.log(
    `[bot] Gasto cadastrado: ${payer} | ${fmtBRL(expense.value)} | ${category} | ${expense.description} | ${splitType} | ${date}`
  );

  if (REPLY) {
    const reply =
      `✅ Gasto cadastrado\n` +
      `${fmtBRL(expense.value)} · ${category}\n` +
      `${expense.description}\n` +
      `Pagou: ${payer === 'barbara' ? 'Barbara' : 'Felipe'} · Divisão: ${splitType}`;
    try {
      await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
    } catch (e) {
      console.error('[bot] Nao consegui responder no grupo:', e.message);
    }
  }
}

start().catch((e) => {
  console.error('[bot] Erro fatal ao iniciar:', e);
  process.exit(1);
});
