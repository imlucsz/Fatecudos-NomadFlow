# Contratos de frontend — NomadFlow Experience 2.0

Documento obrigatório para o agente de evolução visual. Ele descreve contratos existentes; não autoriza redesign nem alteração de comportamento. Qualquer mudança visual deve preservar estados vazios, erros, textos operacionais e assinaturas de dados aqui descritos.

## Modelo central (`src/lib/planning.ts`)

- Valores monetários são inteiros em centavos. Use `money(value, currency, decimals)` para exibição; nunca divida manualmente sem necessidade.
- Datas operacionais usam chaves UTC `YYYY-MM-DD`. Valide com `validDateKey` antes de criar/editar planos. Exibição com `shortDate`.
- `Currency`: `BRL | USD | EUR`; `Strategy`: `economic | balanced | comfort | work`.
- `Evidence`: `ready | future | review | missing | expired | error`; rótulos pt-BR em `evidenceLabels`.
- `Plan` contém rota, datas, orçamento, viajantes, preferências, `arriveAtEnd`, `nightWeights` opcional e metadados de cópia.
- `Stop` representa uma parada com hospedagem. Em rota `arriveAtEnd`, a última parada é somente chegada (`start === end`) e não gera hospedagem; use `isArrivalStop` antes de renderizar/editar noites.
- `Leg` representa deslocamento com modo, horas, preço, status, provedor e URL.
- `Variant` é uma proposta calculada. `Trip` estende `Variant` com `tripId`, `title`, `revision`, reservas, lembretes, horários manuais e jornada.

## Funções puras importantes

- `generate(plan): Variant[]` gera propostas, inclusive `work`, e remove resultados duplicados.
- `costs(variant)` calcula subtotais/total. Não reaplique `calibration` legada em novas telas.
- `validatePlan(plan)` retorna erro legível ou string vazia.
- `editStop(trip,index,change)` é puro: retorna `{result?, error?}`, não muta o original, desloca dependentes, incrementa revisão e preserva detalhes de reservas substituídas em `reservation.replaced`.
- `queue(trip,now?)` projeta itens reserváveis. Cada item tem `id` estável por posição e `signature` sensível a dados operacionais. Nunca confirme usando apenas `id`.
- `registeredReservation(item)` só retorna reserva se `state === "registered"` e assinatura confere.
- `invalidReservations(trip)` lista confirmações registradas cuja assinatura não corresponde mais ao roteiro.
- `archiveInvalidReservation(trip,id,signature)` arquiva o aviso local sem apagar histórico nem cancelar serviços externos.
- `setReservation(trip,target,details)` exige `id + signature`; retorna o mesmo objeto se a assinatura estiver obsoleta.
- `calendar(trip,now?)` projeta eventos. `ics(trip)` exporta VCALENDAR com `DTSTART`, `DTEND`, folding de linhas e alarmes.

## Reservas e revisão

`Reservation.state`: `visited`, `registered` ou `invalidated`. `replaced` pode conter data/período/tipo/assinatura da versão anterior. O componente `ReservationReview` deve aparecer quando houver itens de `invalidReservations`. Ele comunica que arquivar não cancela reserva externa. A reconfirmação deve ocorrer no cartão do item atual para que uma nova assinatura seja gravada.

O gesto de rasgar bilhete em `BookingConfirmation` depende de pointer capture e tem fallback de movimento reduzido. Não remova o estado de erro “O roteiro mudou…”; ele é a proteção contra confirmação obsoleta.

## Persistência local (`src/lib/local-workspace.ts`)

- Cache localStorage: `nomadflow-local-v1`; backup IndexedDB: database `nomadflow`, store `workspace`, key `state`.
- Estado agora carrega `schemaVersion`, `revision` e `updatedAt`; `schemaVersion` atual é 2.
- `useLocal()` expõe `ready` e `persistenceIssue`. O banner de armazenamento é operacional e não deve ser escondido visualmente.
- `waitForWorkspaceSave()` deve ser aguardado antes de navegações que dependem de gravação, como salvar viagem.
- Concorrência entre abas foi reduzida por comparação de revisão e aviso de conflito, mas não é merge transacional completo. Não prometa sincronização multiaba robusta.
- Perfil/senha são demonstração local. Credencial ausente não é mais fail-open; perfis intencionalmente sem senha são marcados em `passwordless`.

## Componentes principais

- `Itinerary({variant,trip?,bookingOptions?,onCafes?,nearbyAction?,mapId})`: composição do explorador de rota, detalhes, edição e reservas. `trip` ausente significa proposta ainda não salva.
- `RouteBookings`/bilhetes recebem `variant`, `trip?` e callbacks/opções. Derivam o estado real por `queue(trip)`; não duplique essa lógica em CSS/visual.
- `TripPage({id,section,reservation})` organiza seções da viagem. `ReservationReview` aparece antes do progresso da jornada.
- `useLocal()` fornece perfil ativo, workspace, templates publicados, atividade de rotas e estado de persistência. Não acesse localStorage diretamente em componentes.
- Integrações Google continuam opcionais: quando client ID/conexão não existem, links manuais de Google Agenda são fallback.

## Restrições para evolução visual

1. Não transformar metáforas em nomes ambíguos de controles.
2. Preservar hierarquia de erros, alertas, evidências e estados de venda futura/revisão.
3. Toda animação de replanejamento precisa refletir diferenças reais de estado e ter equivalente de movimento reduzido.
4. Não simular processamento, sincronização, disponibilidade ou confirmação externa.
5. Alterações visuais devem ser verificadas desktop/mobile com dados reais ou demonstrativos identificados.
