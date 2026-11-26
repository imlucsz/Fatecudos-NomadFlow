# Auditoria técnica

Corrigido: datas impossíveis/NaN (`validDateKey`), índice inválido em `editStop`, readiness do workspace quando IndexedDB falha, variante `work` que existia em dados mas não era gerada, lint contaminado por assets minificados de vídeo, comparação explícita de replanejamento com cancelamento seguro, copy “Verificação pendente” e “proposta”. Pendente P0: deploy público 404. Pendente P1: E2E automatizado, fricção de login antes da experimentação, contraste/fonte pequena, tutorial de replanejamento, CI publicada.

## Complemento do subagente técnico a15f130e

O relatório read-only foi concluído após o commit inicial. Alguns itens apontados já haviam sido corrigidos nesta branch (`validDateKey`, índice inválido, variante `work`, copy e lint). Permanecem como dívidas críticas: semântica incorreta de `arriveAtEnd` com noite/custo após a data final; despesas diárias calculadas por noites em vez de dias de viagem incluindo trânsito; calibração oculta/congelada da demonstração; reservas invalidadas sem fila persistente de revisão; persistência localStorage/IndexedDB sem versionamento/transação e last-write-wins entre abas; parser monetário en-US; ICS sem `DTEND`; sincronização Google em memória; login local fail-open quando credencial está ausente/corrompida. Estes itens devem ser tratados antes de qualquer GO.


## Atualização de engenharia — branch `fix/NF-EXP-08-core`

Corrigidos e verificados por testes/typecheck/lint/build: semântica de chegada final `arriveAtEnd`; despesas diárias usando dias de viagem; remoção da calibração oculta no cálculo novo; fila persistente de revisão para reservas invalidadas; login local fail-open; parser monetário en-US/pt-BR; `DTEND` e folding em ICS; versionamento básico de snapshot local, migração, comparação de revisão IndexedDB/localStorage e aviso operacional de falha/conflito.

Persistem riscos: concorrência multiaba ainda não é merge transacional (apenas detecção/aviso); fila Google continua em memória; dados legados sem senha precisam ser migrados por heurística; E2E cobre apenas smoke público/protegido e CI ainda não foi validada remotamente; deploy público continua 404 em 26/11/2026.
