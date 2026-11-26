# Relatório de segurança — skills e ferramentas externas

Método: clones públicos somente leitura em `/tmp/nf-skill-audit`, sem executar installers. SHAs verificados localmente.

| Repositório | SHA verificado | Licença | Decisão |
|---|---|---|---|
| `feBittar/guia-apple` | `9903adc57db09c013ae1c71a9e097f61310f3870` | MIT | instalado como skill Markdown global |
| `feBittar/cantos-apple` | `4c15b5309c22ade4b0e8cdbdd4c4cc33d5ce19cd` | MIT | instalado como skill Markdown global |
| `emilkowalski/skills` | `64eb3deb9a5fbfa041faf783e0bc3fd635872e9c` | MIT | 20 skills Markdown instaladas globalmente |
| `pbakaus/impeccable` | `2fc5e1459efbbf06d92c7306517c286bf12490cf` | Apache-2.0 | somente referência; hooks/binário/cloud exigem revisão |
| `Leonxlnx/taste-skill` | `d1a2bb41d927083ac7118f60cfc9cdf711810ea0` | MIT | somente referência; Stop hook/scripts/symlink/browser automation |
| `nextlevelbuilder/ui-ux-pro-max-skill` | `b73ee96f8d4ff7bbc279c52dadcd907ffe23629c` | MIT | somente referência; installer/MCP/settings/API keys |
| `siliconjungle/shapeshift-labs-ink-studio` | `3c4f872d13fb814846c4c39aaca5548ae1b23e78` | MIT aparente | biblioteca experimental, não skill; não instalada |

## Instalação realizada

Foram copiados arquivos Markdown e LICENSE para `%APPDATA%\devin\skills` — sem symlinks, hooks, scripts ou permissões adicionais. Verificação por inventário: 22 `SKILL.md`, incluindo `guia-apple`, `cantos-apple`, `gestures`, `apple-design`, `animate`, `mobile-native` etc.

## Riscos não instalados

- `impeccable`: hooks fora do fluxo de aprovação, binário/engine, telemetria/catálogo e possíveis uploads após login.
- `taste-skill`: Stop hook, automação Chrome/CDP, downloads e persistência por symlink.
- `ui-ux-pro-max`: installer, configurações MCP/Claude, scripts externos e chaves de API opcionais.
- `ink-studio`: scripts npm/build e execução de cenas JavaScript; útil apenas como referência/prototipagem isolada.
