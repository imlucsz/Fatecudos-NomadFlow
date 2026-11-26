# Evidências de teste

Atualizado em 26/11/2026 na branch `fix/NF-EXP-08-core`.

## Verificação local executada

- `npm test`: 15/15 testes unitários passaram.
- `npm run test:e2e`: 2/2 smoke tests Playwright passaram em Chromium local.
- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou.

## Cobertura unitária atual

Datas válidas/impossíveis, validação de plano, integridade de geração, edição/replanejamento, chegada final `arriveAtEnd`, custos sem calibração oculta, reservas invalidadas/arquivadas, exportação ICS com `DTEND`/folding, parser monetário e autenticação local.

## Cobertura E2E atual

Apenas smoke: landing pública e rota protegida explicando acesso local. Ainda falta E2E completo de cadastro → planejamento → salvar → editar → revisar reserva → exportar agenda.

## Evidência manual anterior

O fluxo real com exemplo Tailândia foi executado em browser controlado: cadastro local, proposta, salvamento, edição de parada e replanejamento +7 dias. Capturas em `current/screenshots/`.
