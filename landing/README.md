# Landing page — NomadFlow

Página independente e simples de apresentação da ideia do projeto, inclusive para apoiar pedidos de créditos de IA para o desenvolvimento. Arquivos publicáveis exclusivamente em `dist/`; nenhum arquivo do pitch integra esta página.

## Prévia local

Na pasta `landing`, execute `python -m http.server 4173 --bind 127.0.0.1 --directory dist` e abra `http://127.0.0.1:4173`.

## Conteúdo e limites

- Fontes editoriais: solicitação da landing page, `../README.md` e `../docs/VISAO_DO_PRODUTO.md`.
- Status: plataforma proposta, em desenvolvimento; recursos planejados não são anunciados como disponíveis.
- A interação alterna apenas dois cenários ilustrativos de duração. Não implementa o motor do produto, não consulta dados reais nem calcula preços.
- Mapa esquemático e símbolo vetorial criados para esta página. Não são dados cartográficos.
- Fontes DM Sans e Manrope carregadas de Google Fonts, com fontes locais de fallback.
- Sem cadastro, rastreadores, armazenamento de visitantes, gravações ou transcrições.
- Os links externos apontam para o repositório informado no remote `origin`.

## Manutenção

Edite `dist/index.html`, `dist/styles.css` e `dist/script.js`. A página não exige instalação de dependências nem etapa de build. A imagem `dist/social.png` está preparada para compartilhamento; os metadados com URL absoluta deverão ser configurados quando houver um endereço público definido.

Antes de publicar, verifique as larguras de celular e desktop, os links internos, a alternância de cenário e a linguagem de conceito. Publique somente os arquivos desta pasta, preservando o repositório e os originais do pitch. Nenhuma configuração de deploy faz parte desta entrega.
