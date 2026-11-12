# Visão do produto — NomadFlow

**Versão:** 0.1, 12/11/2026  
**Natureza:** alinhamento de produto e hipótese de desenvolvimento; não descreve funcionalidades já entregues.

## 1. Definição oficial

**NomadFlow é uma plataforma de planejamento logístico de jornadas longas para pessoas que viajam enquanto mantêm uma rotina de trabalho remoto.** Ela combina sequência de destinos, tempo de permanência, deslocamentos, pontos-base de hospedagem, rotina local e restrições de orçamento em um roteiro visual que pode ser recalculado quando o plano muda.

**Elevator pitch (30 segundos):** “Quando alguém viaja por meses, não basta descobrir como ir do ponto A ao B. É preciso saber por quanto tempo ficar em cada lugar, onde manter a rotina de trabalho, como alcançar o próximo destino e o que mudar se o orçamento ou as datas não fecharem. O NomadFlow organiza essas decisões conectadas em uma jornada ajustável, em vez de deixar cada etapa solta em uma ferramenta diferente.”

**One-liner (EN):** *A planning workspace for long-term nomadic journeys that connects routes, stays, work-friendly hubs, and budget constraints.*

## 2. Problema, causa e consequência

| Elemento | Formulação |
|---|---|
| Contexto | Jornada de semanas/meses, com várias cidades ou países e necessidade de manter uma rotina remota. |
| Dor | Transporte, hospedagem, permanência e trabalho são planejados de forma fragmentada. |
| Causa operacional | Cada alteração exige revisar manualmente custo total, datas e conexões futuras. |
| Consequência a testar | Tempo gasto replanejando e erros de orçamento/sequenciamento; a gravidade deve ser confirmada com entrevistas. |
| Tarefa principal (JTBD) | “Quando planejo uma jornada longa, quero comparar rotas viáveis e ajustar estadias sem remontar o itinerário inteiro, para saber se meu plano continua possível.” |

## 3. 5W2H

| Dimensão | Decisão |
|---|---|
| **What / O quê** | Planejador logístico de viagens longas com roteiros predefinidos/personalizados e replanejamento de etapas. |
| **Why / Por quê** | Reduzir a fragmentação do planejamento e tornar explícitas as consequências de mudar tempo, percurso ou orçamento. |
| **Who / Quem** | Nômades digitais e viajantes de longa duração; validar prioritariamente pessoas que trabalham remoto. |
| **Where / Onde** | Produto web acessível do Brasil; demo com destinos limitados e rastreáveis, não cobertura global completa. |
| **When / Quando** | Antes da jornada e sempre que precisar alterar o plano. |
| **How / Como** | Base estruturada de destinos/trechos, regras de restrições, comparação de alternativas, linha do tempo e mapa. |
| **How much / Quanto** | MVP de baixo custo, estimado em horas da equipe + serviços gratuitos/créditos permitidos; custo real precisa ser medido. |

## 4. Personas (hipóteses, não pesquisa concluída)

**A — Freelancer viajando por 60 dias.** Trabalha de laptop, quer atravessar quatro cidades da América do Sul, possui orçamento máximo e precisa reservar tempo para trabalhar em cada destino. Valor buscado: não se comprometer com uma sequência inviável.

**B — Viajante de longa duração (slow travel).** Possui data de partida e de chegada, mas é flexível sobre as cidades intermediárias. Valor buscado: explorar alternativas sem começar o planejamento do zero.

**C — Criador de conteúdo nômade (futuro).** Quer publicar e compartilhar uma jornada de meses, com etapas rastreáveis. Valor: transformar o percurso em um roteiro reproduzível. Não é foco do MVP.

**Não confundir “público que pode gostar” com “usuário validado”.** Entrevistar antes de concluir posicionamento.

## 5. O que o produto É e o que NÃO é

**É:** ferramenta de pré-planejamento, organização, comparação e simulação de jornadas longas.  
**Não é:** companhia aérea; agência de turismo; agregador próprio de todas as passagens do planeta; carteira bancária; garantidor de vistos ou empregos; aplicativo que compra todas as etapas automaticamente.

O NomadFlow **não precisa substituir** Rome2Rio, Wanderlog ou sites de reserva. Pode ajudá-los a compor uma jornada e encaminhar a consultas oficiais quando necessário, sem copiar bases de dados protegidas.

## 6. Posicionamento perante o mercado

| Categoria / referência | O que já resolve | Hipótese de espaço a investigar |
|---|---|---|
| [Rome2Rio](https://www.rome2rio.com/) | Alternativas multimodais de A a B, inclusive trechos transfronteiriços. | Planejar permanências sucessivas e reavaliar orçamento/rotina de trabalho ao alterar uma etapa. |
| [Wanderlog](https://wanderlog.com/) | Itinerários, mapas, orçamento, reservas, IA e colaboração. | Experiência explicitamente construída para uma jornada contínua com restrições de trabalho remoto. |
| [Nomads.com](https://nomads.com/) | Informações de destinos para trabalhadores remotos. | Transformar características dos destinos em decisões de sequenciamento e duração da viagem. |
| [NomadFlow.ai](https://app.nomadflow.ai/) | Planejamento de trabalho e viagens para público nômade; já utiliza nome semelhante. | **Sobreposição relevante de nome e posicionamento:** diferenciar claramente a função logística; verificar disponibilidade do nome antes do produto comercial. |

**Importante:** a existência de recursos similares é real. O espaço acima é uma tese de produto e precisa ser validado. Não usar frases como “único do mundo”, “primeiro a integrar tudo” ou “supera gigantes” sem testes comparativos.

## 7. Jornada do usuário — exemplo hipotético

1. Pessoa informa **São Paulo** como origem, deseja conhecer **Buenos Aires, Montevidéu e Santiago**, possui **45 dias** e orçamento máximo informado por ela.
2. O sistema carrega uma proposta de sequência de destinos com dados estruturados da demo.
3. Exibe o mapa com conexões e uma linha do tempo; cada parada tem dias previstos, orçamento por categoria e um local-base de hospedagem de referência.
4. Ao clicar em uma parada, vê pontos de apoio ao trabalho e cultura em torno daquele local, quando disponíveis e autorizados.
5. A pessoa aumenta a permanência em um destino. O sistema atualiza custo total e próximas datas; se o orçamento estourar, oferece alternativas justificadas.
6. O usuário salva ou exporta um resumo com **fontes, hipóteses e lacunas**; não recebe uma promessa de reserva confirmada.

Todos os preços e disponibilidades usados na demo devem ser rotulados como **simulados, estimados ou verificados**, conforme a fonte de cada valor.

## 8. Modelo mental do produto

**Unidade central:** jornada (`Journey`).  
**Elementos:** perfil/restrições (`Constraints`) → paradas (`Stops`) → trechos (`Legs`) → ponto-base (`BaseStay`) → locais próximos (`NearbyPlaces`) → orçamento (`Budget`) → fonte (`Source`).

Cada alteração em parada, duração ou teto de gasto dispara um recálculo **determinístico** da jornada. A IA, se usada, explica os resultados e sugere hipóteses sem alterar dados confirmados.

## 9. Proposta de valor e validação

**Hipótese principal:** usuários de viagens longas consideram mais útil alterar uma etapa e observar as consequências em todo o roteiro do que utilizar ferramentas desconectadas.

**Experimento:** apresentar a 5–8 pessoas com experiência ou interesse concreto em trabalho remoto itinerante um roteiro de 45 dias e pedir: “Acrescente 7 dias em um destino sem exceder o teto de custo”. Medir tempo, erros, compreensão do resultado e preferência em comparação com método atual (planilha/sites).

**Indicadores iniciais (metas, não resultados):** proporção que conclui a tarefa, tempo para revisar o roteiro, clareza do orçamento, quantidade de dados sem fonte e confiança declarada pelo participante.

## 10. Decisões discutidas pela equipe e escopo

| Ideia das conversas | Decisão recomendada |
|---|---|
| Rotas temáticas prontas (ex. América do Sul) | **P0:** 2 roteiros curados como ponto de partida. |
| Rota livre São Paulo → Tailândia em 2 anos | **Visão futura:** demonstrar personalização pequena no MVP; 2 anos/15 países extrapola o prazo. |
| Hospedagem como centro de cafés e coworkings | **P1:** mostra valor para nômades, desde que haja dados e atribuição. |
| Trabalho freelance no caminho | **P2:** não oferecer anúncios inventados ou trabalho local sem examinar permissões legais. |
| Raspagem de toda a internet em milissegundos | **Não prometer:** requer fontes, licenças, desempenho e cobertura que não existem hoje. |
| Mapa animado com cliques e linha entre países | **P0:** visualização clara, leve e funcional; animação sofisticada vem depois. |
| IA fazendo planejamento completo | **Auxiliar:** regras e dados primeiro; modelo generativo não é fonte de preço. |

## 11. Perguntas ainda abertas (decidir com a equipe)

- O MVP terá **1 região geográfica** (recomendado) ou uma demonstração ampla com menos profundidade?
- Orçamento cobre apenas **transporte + hospedagem + alimentação estimada**? Sugestão: sim; seguro e vistos aparecem como custos não incluídos.
- Qual a **fonte permitida** para cada rota, duração e local? Quem verifica a data de atualização?
- O roteiro personalizado reordena destinos livremente ou apenas ajusta ordem de um conjunto curto? Para MVP: conjunto curto.
- A equipe prefere backend único Next.js ou FastAPI separado? Escolher pelo domínio e familiaridade, não por moda.

## 12. Nome e marca

**NomadFlow é o nome de trabalho da equipe.** Existe um produto público chamado NomadFlow.ai com posicionamento próximo; isso não comprova conflito jurídico, mas é motivo suficiente para verificar nome, domínio e registro de marca antes de comercialização ou afirmar exclusividade. O hackathon pode manter o nome atual provisoriamente, com a ciência da equipe.

## 13. Mensagem de apresentação ao júri

“Estamos construindo um planejador de jornadas de longa duração, não mais um buscador de passagens. O NomadFlow conecta deslocamento, permanência, ponto-base de hospedagem e orçamento em um fluxo contínuo. Quando o usuário muda uma etapa, o restante da jornada é reavaliado com regras explicáveis. Nossa demo apresenta esse ciclo funcionando em destinos delimitados, com dados e limitações transparentes.”
