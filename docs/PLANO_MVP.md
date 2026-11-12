# Plano de MVP — Hack Brasil 2026

**Base:** 12/11/2026. **Prazo de submissão informado pelo regulamento do evento:** 30/11/2026, 23h59.  
**Status inicial:** repositório `main` consultado contém apenas `README.md` e `LICENSE`; nenhuma etapa abaixo está marcada como implementada.

## 1. Princípio de execução

**Uma jornada completa que funcione > dezenas de integrações demonstradas apenas em telas.** A apresentação deve conseguir provar que o sistema recalcula um roteiro e explica por quê.

## 2. Escopo fechado de P0

| ID | História / funcionalidade | Critério de aceitação |
|---|---|---|
| RF01 | Cadastrar requisitos | Usuário informa origem, destinos ou região, dias e limite de orçamento; campos validados. |
| RF02 | Selecionar rota predefinida | Há 2 rotas curadas com paradas e duração editáveis. |
| RF03 | Personalizar uma rota | É possível alterar ao menos ordem ou duração de até 4 paradas dentro da cobertura da demo. |
| RF04 | Estimar orçamento total | Soma por categorias e exibe itens sem estimativa, sem mascarar ausência de dados. |
| RF05 | Mostrar mapa + linha do tempo | Destinos e trechos aparecem em ordem; clique abre detalhes. |
| RF06 | Replanejar | Alteração de dias em uma parada recalcula datas e custos; restrições inviáveis geram aviso explicável. |
| RF07 | Exibir proveniência | Custos e dados possuem rótulo: simulado / estimado / verificado, fonte e data quando aplicável. |
| RF08 | Disponibilizar demo | URL pública e fluxo navegável sem credenciais de terceiros; testes principais passam. |

## 3. Recurso P1 opcional

Ponto-base de hospedagem, com cafés/coworkings em raio de 1/3/5 km e indicação de origem de cada local. Só implementar após concluir RF01–RF08.

## 4. Fora de escopo explícito

Compras reais de passagens, disponibilidade global em tempo real, análise de vistos automática, trabalho local garantido, Open Finance, scraping massivo, roteiro de 2 anos com 15 países, autenticação complexa, múltiplos idiomas completos e reservas integradas.

## 5. Cronograma proposto

| Janela | Entrega / gate |
|---|---|
| **12–14/11** | Fechar a definição, escolher região/2 roteiros, criar estrutura do projeto e seed rastreável. |
| **15–18/11** | Motor de jornadas e cálculos; testes unitários de orçamento e datas. |
| **19–22/11** | Interface do formulário, mapa, timeline e visualização por etapa. |
| **23–25/11** | Replanejamento integrado, avisos e polimento do fluxo P0. |
| **26–28/11** | Testes end-to-end, acessibilidade, responsividade, validação com usuários e deploy estável. |
| **29–30/11** | Vídeo ≤3 minutos, README fiel ao estado real, revisão de licenças, links e submissão. |

O cronograma é agressivo: corte P1 imediatamente se houver atraso em P0.

## 6. Demo recomendada de 3 minutos

- **0:00–0:25:** problema — planejar meses entre várias cidades exige conciliar decisões dependentes.
- **0:25–0:55:** perfil — 45 dias, orçamento informado, região América do Sul.
- **0:55–1:30:** uma rota predefinida é carregada; mapa, timeline e categorias de custo são exibidos.
- **1:30–2:15:** usuário acrescenta 7 dias em uma parada; sistema recalcula custo e data, alerta o orçamento e mostra alternativa.
- **2:15–2:40:** detalhe de destino e, se P1 existir, locais próximos ao ponto-base.
- **2:40–3:00:** impacto, limites dos dados e próximos passos. O vídeo precisa mostrar o software real, não somente slides ou mockups.

## 7. Testes e qualidade

### Testes de domínio (mínimos)

1. Custo total igual à soma de seus componentes conhecidos.
2. Alterar noites de uma parada atualiza a duração e os gastos pertinentes.
3. Dias negativos, valores inválidos ou origem ausente não geram itinerário.
4. Orçamento inviável exibe alerta, sem inventar uma rota barata.
5. Dados sem fonte aparecem explicitamente como simulados/desconhecidos.
6. A troca de ordem mantém integridade das paradas e datas.
7. Não há coleta ou exposição de dados pessoais reais de terceiros na demo.

### Testes de experiência

- Testar em celular e desktop, teclado, contraste e rótulos de botões.
- Pedir a pelo menos 5 participantes que adicionem uma parada e alterem uma duração; medir se entenderam o novo custo.
- Registrar feedback e mudanças no `docs/DECISOES.md` ou em issues.

## 8. Priorização de tarefas do time

| Frente | Responsabilidade principal |
|---|---|
| Produto & dados | Regras, cenários, seed, fontes e limitações. |
| Backend & testes | Replanejamento, orçamento, validação e endpoints. |
| Frontend & UX | Formulários, mapa, timeline, interação e mobile. |
| Qualidade & comunicação | Teste ponta a ponta, deploy, README, demo e vídeo. |

Uma pessoa pode cobrir mais de uma frente; a equipe deve definir responsáveis pelo nome em seu próprio quadro.

## 9. Condições para dizer “pronto”

- [ ] Usuário percorre fluxo sem intervenção manual do desenvolvedor.
- [ ] Mudança de etapa modifica resultados consistentes e visíveis.
- [ ] Estimativas exibem claramente as limitações e fontes.
- [ ] Demo online, sem links quebrados e com instruções funcionais.
- [ ] Código público e histórico respeitam o período permitido do evento.
- [ ] Vídeo demonstra P0 real em até 3 minutos.
