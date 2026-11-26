# NomadFlow

Planejamento logístico de jornadas longas para pessoas que viajam por semanas ou meses e precisam reorganizar destinos, datas, deslocamentos, hospedagem e orçamento sem perder o contexto.

**Projeto:** Hack Brasil 2026 · **Trilha:** Logística & Automação · **Equipe:** Fatecudos  
**Estado atual:** aplicação Next.js funcional em ambiente local; release público ainda em **NO-GO** porque a URL informada da Vercel retorna 404 e a cobertura E2E ainda é parcial.

## O que já existe no código

- Planejador de viagem por texto, com parser determinístico e apoio opcional de voz.
- Geração de propostas (`economic`, `balanced`, `comfort`, `work`) com paradas, trechos, hospedagens e estimativas.
- Comparação de propostas, edição de parada e replanejamento com recálculo de datas/custos.
- Reservas locais com assinatura operacional, revisão de itens invalidados e exportação ICS.
- Agenda da viagem e integração opcional com Google Calendar quando houver client ID configurado.
- Perfis e dados de demonstração persistidos no navegador com IndexedDB/localStorage.
- Catálogo de rotas, mapas, tutorial, jornada e publicação local de modelos.

Custos, disponibilidade e ofertas são dados demonstrativos/estimados. O produto não deve ser apresentado como fonte de preço ou disponibilidade em tempo real sem integração autorizada e verificada.

## Stack real

- Next.js 16, React 19 e TypeScript estrito.
- CSS próprio; MapLibre; `d3-geo`, `topojson` e `world-atlas`.
- IndexedDB/localStorage para persistência local.
- Playwright para smoke E2E; testes de domínio com `node:test` + `tsx`.

## Como executar

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000`.

Para Google Calendar, copie `.env.example` e configure `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID`. Sem essa variável, o fluxo usa links manuais como fallback.

## Verificação

```bash
npm test
npm run typecheck
npm run lint
npm run test:e2e
npm run build
```

Antes do primeiro E2E local, instale o browser do Playwright:

```bash
npx playwright install chromium
```

## Organização do repositório

```text
src/app/          rotas Next.js e estilos globais/das áreas
src/components/   componentes da aplicação
src/lib/          motor de planejamento, persistência, parser e testes
public/           imagens e vídeo usados pela aplicação
e2e/              smoke tests Playwright
docs/             documentação de produto, engenharia e evidências
video/            material local do pitch, intencionalmente fora do Git neste workspace
```

A pasta legada `landing/` foi removida por ser um protótipo independente substituído pela home real em `src/app/page.tsx`/`src/components/landing.tsx`.

## Documentação principal

- [Índice da documentação](docs/README.md)
- [Visão do produto](docs/VISAO_DO_PRODUTO.md)
- [Plano de MVP](docs/PLANO_MVP.md)
- [Arquitetura e dados](docs/ARQUITETURA_E_DADOS.md)
- [Contratos de frontend](docs/experience/FRONTEND_CONTRACTS.md)
- [Auditoria técnica](docs/experience/TECHNICAL_AUDIT.md)
- [Release readiness](docs/experience/RELEASE_READINESS.md)

## Limites importantes

- O deploy público `https://nomadflow-rose.vercel.app` retornou 404 na última verificação; não tratar como demo disponível.
- A concorrência entre abas foi reduzida com versionamento e aviso de conflito, mas não há merge transacional completo.
- A suíte E2E ainda é smoke; não cobre todo o fluxo de planejamento/replanejamento.
- O material de vídeo segue regras próprias e não deve alterar o aplicativo ou infraestrutura.

## Licença

Consulte [LICENSE](LICENSE) (MIT). Respeite licenças e atribuições de dependências, dados e mídia de terceiros.
