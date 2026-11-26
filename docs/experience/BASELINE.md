# Baseline verificável — NomadFlow Experience 2.0

Data: 2026-11-26. Branch de trabalho: `feat/NF-EXP-experience-2`. SHA inicial da `main`: `1e833d08104a787214231d4cfadc2deedb1fdce2`.

## Estado do repositório e deploy

- Repositório público `imlucsz/Fatecudos-NomadFlow`, branch padrão `main`, licença MIT, sem PRs abertos e só uma branch remota no início.
- Havia arquivos locais não rastreados de vídeo/pitch (`.agents/`, `.codex/`, `video/`, docs de pitch). Eles foram preservados e não entraram no escopo das alterações.
- `https://nomadflow-rose.vercel.app` respondeu **404 NOT_FOUND** em 2026-11-26. É um problema P0 de deploy/disponibilidade, mas não pode ser corrigido sem acesso ao projeto Vercel.
- Stack real: Next.js 16.4.6, React 19.3.1, TypeScript, MapLibre, CSS próprio, IndexedDB/localStorage; sem backend remoto.
- Rotas: `/`, `/explorar`, `/explorar/[slug]`, `/planejar`, `/comparar`, `/viagens`, `/viagens/[id]`, `/viagens/[id]/agenda`, `/conta`.

## Comandos iniciais

- `npm ci`: concluído; 0 vulnerabilidades no baseline de dependências declaradas.
- `npm run typecheck`: passou.
- `npm run build`: passou; rotas estáticas/dinâmicas geradas.
- `npm run lint` inicial: falhou porque `eslint .` varreu `video/pitch/output/HyperFrames/assets/gsap.min.js` (16 erros e centenas de warnings em arquivo minificado de terceiros). Correção aplicada: ignorar `video/`, `.agents/`, `.codex/` no lint, sem alterar esses arquivos.

## Evidências capturadas

- Screenshots desktop/mobile de páginas públicas e gates: `docs/experience/baseline/screenshots/`.
- Relatórios de texto/console: `docs/experience/baseline/static-capture-report.json` e `flow-capture-report.json`.
- Fluxo real executado em browser controlado: criação de perfil local, geração do exemplo Tailândia, salvamento, edição de parada e replanejamento +7 dias. O replanejamento deslocou São Paulo → Lisboa de 31 jan para 7 fev e o fim de 26 dez 2027 para 2 jan 2028.

## Achados de baseline

- O tutorial existente é abrangente, mas seu spotlight pode bloquear ações fora da sequência — comportamento intencional, porém precisa de pulo/retomada mais claro.
- README está desatualizado: afirma que não há app executável, embora exista aplicação completa.
- Landing usa padrão SaaS/IA (vídeo escuro, chat, sparkles, cards), enquanto o diferencial real é cartografia/replanejamento.
- `strategies.work` existia sem geração da variante `work` — corrigido.
- “Rechecagem pendente” foi substituído por “Verificação pendente”.
- Não havia suíte de testes.
