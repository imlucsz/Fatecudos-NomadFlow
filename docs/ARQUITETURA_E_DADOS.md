# Arquitetura e estratégia de dados — NomadFlow

**Documento de proposta técnica; nenhuma implementação é inferida a partir dele.**

## 1. Arquitetura mínima recomendada

```text
Navegador (Next.js / TypeScript)
  ├─ Formulário de requisitos e escolhas
  ├─ Mapa interativo + linha do tempo
  └─ Orçamento e replanejamento visível
                │
                ▼
        Motor de planejamento
  ├─ validação de restrições
  ├─ cálculo de datas e orçamento
  ├─ comparação de alternativas
  └─ explicação dos critérios usados
                │
                ▼
         Base estruturada
  ├─ cidades e coordenadas
  ├─ trechos e modos de deslocamento
  ├─ estadias / estimativas categorizadas
  ├─ pontos de apoio à rotina remota
  └─ fontes, licenças e datas
```

**Escolha sugerida para velocidade:** Next.js + TypeScript full-stack para P0, evitando dividir um projeto ainda vazio em dois deploys. Se já houver domínio de Python/FastAPI ou um motor de otimização mais elaborado, uma API separada pode fazer sentido; registrar a decisão, não usar duas stacks sem justificativa.

**Mapa:** Leaflet + dados OpenStreetMap com atribuição; verificar termos do provedor de tiles. Usar rotas ilustrativas quando não houver dados de traçado autorizados, deixando isso visível.

## 2. Modelo de dados conceitual

```typescript
type SourceQuality = "synthetic" | "estimate" | "verified";

type DataSource = {
  label: string;
  url?: string;
  observedAt?: string; // ISO date; omitir quando não disponível
  quality: SourceQuality;
};

type JourneyConstraints = {
  originId: string;
  destinationIds: string[];
  totalDays: number;
  budgetLimitBRL: number;
  requiresRemoteWork: boolean;
};

type Stop = {
  cityId: string;
  startDate: string;
  nights: number;
  stayCostEstimateBRL?: number;
  foodCostEstimateBRL?: number;
  sources: DataSource[];
};

type Leg = {
  fromCityId: string;
  toCityId: string;
  mode: "bus" | "train" | "plane" | "ferry" | "other";
  costEstimateBRL?: number;
  durationHours?: number;
  source: DataSource;
};
```

Os exemplos de tipos são contratos **propostos**, não código executado. A demo deve escolher convenções claras para noites, dias de deslocamento, câmbio e moedas. Não misturar preço de passagem com gasto diário.

## 3. Cálculo do orçamento

```text
Custo estimado total =
   soma(estadia por parada)
 + soma(alimentação por parada)
 + soma(deslocamento por trecho)
 + despesas locais conhecidas
 + reserva de contingência informada
```

- Dados ausentes **não** valem automaticamente zero; exibir “estimativa incompleta”.
- Definir e testar a convenção `nights` versus `days`.
- Recalcular datas seguintes de forma consistente quando uma parada muda.
- Quando custo excede teto, gerar alternativas justificadas (menos noites ou parada diferente dentro do dataset), sem prometer viabilidade irrestrita.
- Evitar tratar o trabalho freelance hipotético como renda garantida na conta.

## 4. Planejador inicial: regras, não magia

1. Filtrar destinos não cobertos pelo conjunto da demo e avisar sobre lacunas.
2. Construir uma sequência inicial a partir de 2 roteiros curados ou de um conjunto delimitado de paradas.
3. Calcular custos/duração de cada trecho e permanência com fontes disponíveis.
4. Gerar no máximo 2–3 alternativas ajustando duração ou ordem dentro do dataset.
5. Classificar por critérios transparentes: cabe no orçamento? respeita tempo total? custo estimado? número de deslocamentos? viabilidade para rotina remota?
6. Explicar as trocas (trade-offs) e pedir escolha ao usuário.

Para MVP, **não** é necessário solucionar um problema global de roteamento com dados do mundo inteiro nem usar LLM para tomar todas as decisões.

## 5. Estratégia de aquisição de dados

| Camada | MVP | Evolução |
|---|---|---|
| Localização | Cidades e coordenadas públicas com atribuição | Base geográfica mais abrangente |
| Roteiros | 2 rotas curadas + trechos selecionados | Motor com conectores licenciados |
| Preços de transporte | Estimativas sintéticas/curadas, sempre rotuladas | API autorizada de viagens / parceiros |
| Estadia e alimentação | Estimativa por destino, com fonte e data se real | Consultas oficiais ou integrações licenciadas |
| Cafés / coworkings | Pontos de teste e fonte autorizada | Busca geográfica com provedor e termos adequados |
| Empregos / freelas | **Fora do P0** | Fontes autorizadas + respeito às regras locais de trabalho |
| IA | Ausente ou usada para explicar dados já calculados | Sugestões com validação e limites explícitos |

**Importante:** o regulamento do Hack Brasil restringe coleta que viole termos de sites. Não propor “raspar toda a internet” como plano de MVP. Firecrawl pode ser um conector útil se a coleta for permitida, mas não é obrigatório por definição.

## 6. Segurança, privacidade e limitações

- Guardar apenas informações necessárias ao planejamento.
- Nunca colocar chaves de APIs no frontend ou no repositório.
- Respeitar termos de fornecedores, licença de dados e atribuições cartográficas.
- Destacar que visto, autorização de trabalho, requisitos de saúde e imigração exigem conferência em fontes oficiais atualizadas; não inferir legalidade.
- Se uma opção não tem preço verificado, não usar etiqueta “menor preço”.
- Garantir que a demo funcione mesmo sem provedores externos, com cenários fixos identificados como simulados.

## 7. Principais riscos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Escopo mundial e plurianual | Alta | Restringir MVP a uma região / poucos destinos e mostrar roadmap. |
| Integrações externas indisponíveis | Alta | Fixtures versionadas e adapters substituíveis. |
| IA inventa preço ou rota | Alta | Cálculo determinístico; validar saída, fonte e datas. |
| Dados reais desatualizados | Alta | Badge de confiança + data de consulta; não prometer disponibilidade. |
| Excesso de efeitos visuais | Média | Priorizar fluxo interativo e legibilidade. |
| Enquadramento na trilha | Média | Demonstrar automatização logística e replanejamento, não só recomendações turísticas. |
| Nome semelhante no mercado | Média | Verificar uso comercial e marca “NomadFlow” antes de lançamento; não alegar exclusividade. |
| Pouco tempo até 30/11 | Alta | Fechar P0, cortar P1/P2, testes desde o início. |

## 8. O que medir no piloto

- **Tempo de execução:** quanto leva para criar e ajustar um roteiro em comparação com o método atual.
- **Corretude:** orçamento e datas recalculados sem inconsistência nos testes.
- **Compreensão:** usuários conseguem explicar a mudança no custo quando alteram uma parada.
- **Transparência:** porcentagem de valores com rótulo claro de estimativa/fonte.
- **Utilidade:** usuários relatam se usariam a ferramenta no planejamento real (hipótese; não adoção comprovada).

---

### Fontes de comparação e consulta

- https://www.rome2rio.com/about/rome2rio-app/
- https://wanderlog.com/
- https://nomads.com/
- https://hackbrasil.com/regulamento

Essas fontes ajudam na análise de posicionamento e regras. O documento não incorpora dados não licenciados desses serviços ao produto.
