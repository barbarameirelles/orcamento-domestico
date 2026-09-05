# WhatsApp → Gasto (bot do orçamento doméstico)

Lê mensagens do grupo **APENAS GASTOS CASA** no WhatsApp e cadastra o gasto
direto na tabela `expenses` do Supabase (o mesmo banco do app). O app mostra o
gasto automaticamente.

Funciona como um **aparelho vinculado** (igual ao WhatsApp Web). Não precisa
ficar 24/7: quando o PC liga e o bot reconecta, o WhatsApp entrega as mensagens
que chegaram enquanto ele estava offline e o bot cadastra tudo de uma vez.

---

## Como escrever no grupo

Formato: `[quem] <valor> <descrição> [divisão]`

| Mensagem no grupo               | Vira                                                        |
| ------------------------------- | ---------------------------------------------------------- |
| `45,90 ifood`                   | quem enviou pagou · R$45,90 · Alimentação · 50/50          |
| `felipe 120 farmácia`           | Felipe pagou · R$120,00 · Saúde · 50/50                    |
| `barbara 89,90 mercado 50/50`   | Barbara pagou · R$89,90 · Alimentação · 50/50              |
| `R$ 1.234,56 conserto carro`    | quem enviou pagou · R$1.234,56 · Outros · 50/50            |
| `felipe 60 uber 100/0`          | Felipe pagou · divisão 100/0 (Barbara arca com 100%)       |

Regras:

- **Valor e descrição são obrigatórios.** Sem eles, a mensagem é ignorada (então
  conversa normal no grupo não vira gasto).
- **Quem pagou** vem do número de quem enviou (mapeado no `.env`). Um nome no
  começo (`felipe`/`barbara`) sobrescreve.
- **Categoria** é inferida da descrição (mesma lógica do app).
- **Divisão** é `50/50` por padrão (ou a regra da categoria). Um `NN/NN` no fim
  sobrescreve. `NN/NN` é `[quanto a Barbara arca]/[quanto o Felipe arca]`.
- Use **vírgula** como separador decimal (padrão BR). Evite ponto de milhar em
  valores sem centavos (`1234` em vez de `1.234`).

O bot responde no grupo confirmando cada gasto (`✅ Gasto cadastrado...`).

---

## Instalação (uma vez)

1. **Criar a tabela de controle no Supabase**
   No Supabase → SQL Editor, rode o conteúdo de [`schema.sql`](schema.sql).

2. **Configurar o `.env`**
   ```bash
   cd whatsapp-bot
   cp .env.example .env
   ```
   Edite o `.env`:
   - `SUPABASE_URL`: a mesma Project URL do app.
   - `SUPABASE_KEY`: recomendado a **service_role** key (Supabase → Settings →
     API). Ela fica só neste backend, nunca no navegador. Como alternativa, a
     mesma anon key do app funciona (desde que o RLS permita insert).
   - `WA_BARBARA` / `WA_FELIPE`: número de cada um (só dígitos, com DDI+DDD).
     Assim quem envia vira o pagador automaticamente.
   - `DEFAULT_PAYER`: usado quando o número não bate com nenhum acima.

3. **Instalar dependências**
   ```bash
   cd whatsapp-bot
   npm install
   ```

4. **Primeira execução (parear o WhatsApp)**
   ```bash
   npm start
   ```
   Um QR code aparece no terminal. No celular: WhatsApp → **Aparelhos
   conectados** → **Conectar um aparelho** → escaneie. Pronto — a sessão fica
   salva na pasta `auth_info/` e você não precisa escanear de novo.

   Na conexão, o bot lista os grupos que encontrou e confirma qual está ouvindo.

---

## Uso no dia a dia

Só ligar o PC e rodar:

```bash
cd whatsapp-bot && npm start
```

Deixe rodando enquanto o PC estiver ligado. Ao reconectar, ele pega o que ficou
pendente. Para manter sempre ligado sem terminal aberto, dá pra usar `pm2`
(opcional):

```bash
npm install -g pm2
pm2 start src/index.js --name orcamento-bot
pm2 save
```

---

## Observações

- **Confirmação atrasada:** o `✅` só chega quando o PC estiver online.
- **Anti-duplicata:** cada mensagem é registrada em `wa_processed`; reprocessar o
  backlog nunca cria gasto repetido.
- **Sessão expirada:** se o PC ficar desligado muitos dias, o WhatsApp pode
  desvincular o aparelho. Nesse caso apague a pasta `auth_info/` e rode de novo
  pra reescanear o QR.
- **`source: 'whatsapp'`:** os gastos criados aqui ficam marcados com essa
  origem, dá pra filtrar/identificar no app.
- As regras de categoria (`inferCategory`) são uma cópia de `src/data.ts`. Se
  mudar lá, espelhe em `src/inferCategory.js`.
