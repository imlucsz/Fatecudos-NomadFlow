# Matriz de funcionalidades — preservar

| Funcionalidade | Local | Estado baseline | Evidência | Prioridade |
|---|---|---|---|---|
| Landing pública e composer | `src/components/landing.tsx` | funcional | `desktop-home.webp` | P1 |
| Catálogo Explorar e modelos | `src/components/catalog.tsx` | funcional | `desktop-explorar.webp` | P1 |
| Login/perfil local | `src/lib/local-workspace.ts` | funcional; local explícito | fluxo 01–02 | P0 |
| Planejador por texto/voz e edição manual | `src/components/planner.tsx` | funcional | fluxo 03–04 | P0 |
| Geração determinística de propostas | `src/lib/planning.ts` | funcional; sem testes antes | testes novos | P0 |
| Comparação/orçamento | `src/components/compare.tsx` | funcional | fluxo 04 | P0 |
| Salvar viagem | `SaveDialog` | funcional | fluxo 05–06 | P0 |
| Mapa/itinerário/status | `Itinerary`, `TrailExplorer` | funcional | fluxo 06 | P0 |
| Edição/replanejamento | `editStop` | funcional; UX de comparação melhorada | fluxo 07–08 | P0 |
| Agenda/ICS/Google opcional | `trip-agenda`, `google-calendar` | presente; Google depende de env | código | P1 |
| Publicação/comunidade local | `publishing`, catálogo | presente; secundário | código | P2 |
| Tutorial existente | `tutorial*.tsx` | funcional, precisa evoluir | fluxo 02–04 | P1 |
| Voz/microfone | `recorded-travel-request` | presente; requer permissão real | código | P2 |

Nenhuma funcionalidade foi removida nesta etapa.
