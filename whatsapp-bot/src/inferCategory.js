// Copia standalone de inferCategory() de src/data.ts, para o bot nao depender
// do codigo do app (que usa Vite/import.meta.env). Se mudar as regras no app,
// espelhe aqui.
export function inferCategory(description) {
  // minusculas + remove acentos, pra casar "farmácia" com a regra "farmacia" etc.
  const d = (description || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/pet\s?love|petz|cobasi|pet\s?shop/.test(d)) return 'Pets';
  if (/drogasil|drogaria|raia\d|\braia\b|farmacia|extra ?farma|rd\s?saude|clinica|hospital|laborat|duxnutrition|performancenu|afeet|care\s?club|\bsaude\b|nutrition/.test(d)) return 'Saúde';
  if (/spotify|netflix|apple\.?com|applecom|claro\s?tv|amazon ad|\bprime\b|openai|chatgpt|anthropic|claude\.ai|disney\+|hbo|globoplay|crewapp/.test(d)) return 'Assinaturas';
  if (/ifd\*|ifood|uber\s?eats|\bpizz|restaur|\bcafe|botanikafe|boteco|bistro|cheesecake|navarro|sapore|koa\s?food|madaling|insalata|helix|priazzo|amor\s?in\s?pani|bonete|santigusta|carrefour|\bextra\s|pao de a|supermerc|mercado|\bfeira\b|padaria|hortif|sorvet|burguer|burger|sushi|temaki|companhia brasi|liv\s?up|gpc comercio|nespresso|agua de coco/.test(d)) return 'Alimentação';
  if (/hotel|booking|airbnb|gol linhas|latam|azul linhas|smiles|cinema|ingresso|teatro|festival|parque|disney|universal|tickets|eventim|playstation|steam|nintendo|centauro|iguanasports|laviesports|\bsports?\b/.test(d)) return 'Lazer';
  if (/iptu|condom|aluguel|enel|cpfl|sabesp|comgas|energia|internet|vivo fibra|claro fibra|leroy|merlin|telhanorte/.test(d)) return 'Moradia';
  return 'Outros';
}
