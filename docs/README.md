# Documentação do NomadFlow

Este índice separa documentos vivos de documentos históricos/proposições. Em conflito, o estado verificado em `experience/RELEASE_READINESS.md` e `experience/TECHNICAL_AUDIT.md` prevalece.

## Produto e arquitetura

- `VISAO_DO_PRODUTO.md` — problema, público, posicionamento e limites.
- `PLANO_MVP.md` — plano histórico do MVP e critérios iniciais de aceite.
- `ARQUITETURA_E_DADOS.md` — estratégia conceitual; nem todo contrato descrito ali é o contrato implementado.

## Engenharia e contratos atuais

- `experience/FRONTEND_CONTRACTS.md` — contratos implementados que o agente visual deve preservar.
- `experience/TECHNICAL_AUDIT.md` — dívidas e correções técnicas verificadas.
- `experience/RELEASE_READINESS.md` — gate atual de release e motivos do NO-GO.
- `experience/TEST_EVIDENCE.md` — evidências resumidas de testes.
- `experience/FEATURE_MATRIX.md` — funcionalidades da aplicação que não devem desaparecer acidentalmente.

## Experiência e direção visual

Documentos em `experience/` sobre universo, mascote, motion, onboarding e referências são propostas ou decisões preliminares. Eles não autorizam redesign integral sem aprovação do proprietário.

## Evidências visuais

- `experience/baseline/` — capturas do estado inicial da auditoria.
- `experience/current/` — capturas do estado mais recente documentado.

Artefatos transitórios de captura, arquivos com nomes quebrados e duplicatas compactadas foram removidos. As imagens restantes são evidências de comparação em WebP de alta qualidade e não devem ser tratadas como especificação final de design.

## Pitch audiovisual

`NOMADFLOW_VIDEO_PROMPT_*.md`, `.agents/`, `.codex/` e `video/` pertencem ao escopo local isolado do vídeo e são intencionalmente ignorados pelo Git neste workspace. Não misture alterações do pitch com engenharia do aplicativo.
