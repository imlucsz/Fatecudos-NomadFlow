# 🌍 NomadFlow

> **Planejamento logístico de jornadas longas para quem viaja e trabalha em movimento.**  
> *Long-term travel logistics for digital nomads and slow travelers.*

**Projeto:** Hack Brasil 2026 · **Trilha:** Logística & Automação · **Equipe:** Fatecudos  
**Estado verificado do repositório em 12/11/2026:** concepção e documentação. A branch `main` consultada contém `README.md` e `LICENSE`; ainda não há aplicação executável publicada no repositório.

---

## O problema

Uma viagem longa não é apenas uma sequência de passagens. Quem pretende permanecer semanas ou meses em vários destinos precisa decidir **em que ordem visitar cada lugar, quanto tempo ficar, como se deslocar, onde se hospedar, onde trabalhar remotamente e como manter o plano dentro de um orçamento**.

Hoje essas decisões são feitas em ferramentas diferentes. Quando a duração ou o custo de uma etapa muda, o viajante precisa revisar as próximas etapas manualmente.

## A proposta

O **NomadFlow** é uma plataforma de planejamento logístico para **nômades digitais e viajantes de longa duração**. A pessoa escolhe uma **jornada predefinida** ou constrói uma **rota personalizada**. O sistema organiza a sequência de destinos, estadias, deslocamentos, pontos de apoio ao trabalho e estimativas de custos em **um itinerário visual e ajustável**.

**Pergunta central:** *“Como organizar uma jornada de longa duração sem perder o controle da logística e da capacidade de continuar trabalhando?”*

### O diferencial que pretendemos validar

Não queremos competir com um buscador de passagens nem alegar que inventamos itinerários com mapas. A hipótese de valor é **tratar toda a jornada como um fluxo contínuo de decisões interdependentes**:

`origem → deslocamento → estadia → rotina local / trabalho → próximo deslocamento`

Se uma permanência aumenta de 10 para 20 dias, o orçamento, as próximas datas e as alternativas precisam ser recalculados. **Isso é uma hipótese de diferenciação, ainda não um resultado comprovado.**

## Para quem

- **Público inicial:** pessoas que trabalham remotamente e planejam percursos de 30 a 180 dias, com vários destinos.
- **Público secundário:** viajantes de longa duração que buscam previsibilidade logística, mesmo sem trabalhar remotamente.
- **Não é foco inicial:** viagens rápidas de fim de semana, compra de passagens e gestão bancária.

## Fluxo principal proposto

1. **Defina a jornada:** origem, região ou destino desejado, tempo disponível, orçamento e preferências.
2. **Escolha o formato:** roteiro predefinido ou planejamento personalizado.
3. **Compare alternativas:** sequência de paradas, duração, custos estimados e critérios de viabilidade.
4. **Explore o mapa:** linha do tempo, trechos entre destinos e informações de cada parada.
5. **Escolha um ponto-base:** localização de hospedagem de referência e pontos de interesse para a rotina de trabalho (ex.: cafés e coworkings) nas proximidades.
6. **Replaneje:** altere dias, ordem ou limite de gastos e veja como o restante da jornada é afetado.

> **Importante:** custos, ofertas, disponibilidade e condições de entrada em países **não serão apresentados como dados em tempo real sem fonte autorizada e atualização verificável**. A demo inicial poderá utilizar estimativas e cenários **claramente identificados como simulados**.

## Escopo da primeira demonstração (MVP)

### Essencial (P0)
- [ ] Formulário de origem, destino/região, duração e teto de orçamento.
- [ ] Dois roteiros predefinidos e um fluxo personalizado com conjunto limitado de destinos.
- [ ] Mapa interativo e linha do tempo com etapas da jornada.
- [ ] Estimativas de deslocamento, estadia e orçamento por destino com origem dos dados indicada.
- [ ] Motor de regras que detecta orçamento excedido e recalcula o plano quando uma etapa é alterada.
- [ ] Demonstração de ponta a ponta pública, usando dados fictícios ou públicos autorizados.

### Desejável (P1, somente após P0)
- [ ] Pontos de apoio à rotina remota ao redor de uma hospedagem de referência (raio de 1/3/5 km).
- [ ] Comparação de alternativas por custo, duração e conveniência.
- [ ] Exportação do resumo da jornada.

### Futuro (fora do compromisso do MVP)
- Recomendações com IA e integração com fornecedores de viagem autorizados.
- Tarifas e disponibilidade em tempo real, quando houver contratos/APIs adequados.
- Rotas globais de vários anos com restrições migratórias e sazonais verificadas.
- Sincronização de reservas, propostas de trabalho e colaboração entre viajantes.

## Tecnologias consideradas (a validar, não implementadas)

| Camada | Opção de trabalho | Motivo |
|---|---|---|
| Interface | Next.js + TypeScript + Tailwind | Experiência web responsiva e rápida iteração |
| Mapa | Leaflet + OpenStreetMap, respeitando as licenças e políticas de tiles | Exibição de destinos e trajetos |
| Motor de planejamento | Python/FastAPI **ou** TypeScript no backend | Regras de orçamento, duração e sequenciamento; decidir uma stack antes da implementação |
| Dados | Conjunto estruturado de demonstração; banco persistente se necessário | Evitar depender de integrações externas frágeis |
| IA generativa | Opcional, com respostas estruturadas e validação | Auxiliar nas explicações; não calcular fatos sem dados |
| Hospedagem | A definir após protótipo | Garantir demo acessível durante a avaliação |

**Nenhuma dessas tecnologias deve ser tratada como implementada apenas por aparecer nesta tabela.**

## Mercado e posicionamento

- [Rome2Rio](https://www.rome2rio.com/) pesquisa alternativas de transporte entre lugares.
- [Wanderlog](https://wanderlog.com/) oferece mapas, roteiros, orçamento e planejamento de viagens.
- [Nomads.com](https://nomads.com/) reúne informações relevantes a trabalhadores remotos em destinos.
- [NomadFlow.ai](https://app.nomadflow.ai/) já usa um nome muito semelhante e combina planejamento de viagens e trabalho remoto. **Nome do projeto ainda precisa de verificação de disponibilidade/uso de marca antes de lançamento comercial.**

O NomadFlow **não afirma ser o primeiro** a reunir esses elementos. Busca testar uma experiência orientada a **jornadas contínuas e às dependências entre estadias, deslocamentos, orçamento e trabalho remoto**. Comparação detalhada em [Visão do Produto](docs/VISAO_DO_PRODUTO.md).

## Documentação

- [Visão do produto, público, problema e 5W2H](docs/VISAO_DO_PRODUTO.md)
- [MVP, critérios de aceitação e cronograma](docs/PLANO_MVP.md)
- [Arquitetura, dados, limites e riscos](docs/ARQUITETURA_E_DADOS.md)

## Demonstração e execução

**Ainda não há instruções de instalação, link de demo ou vídeo verificados na branch `main`.** Esses campos serão preenchidos quando existir uma implementação real.

Para o Hack Brasil 2026, a entrega deverá incluir código em repositório público criado após a abertura permitida, demo acessível, vídeo de até 3 minutos e documentação compatível com o que realmente funciona. Verificar o regulamento atualizado antes da submissão: [Hack Brasil](https://hackbrasil.com/).

## Licença

Consulte [LICENSE](LICENSE) (MIT). A licença e a autoria dos componentes de terceiros devem ser respeitadas.
