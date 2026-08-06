# Event Seating Manager — TODO

## Database & Backend
- [x] Define schema: tables (mesas), guests (convidados), events
- [x] Generate and apply DB migration
- [x] tRPC router: CRUD for tables (assign company, capacity)
- [x] tRPC router: CRUD for guests (create, assign to table, move, remove)
- [x] tRPC router: import guests from XLS (multipart upload endpoint)
- [x] tRPC router: export seating as CSV
- [x] tRPC router: export seating as PDF (client-side jsPDF)
- [x] tRPC router: unassigned guests list with search/filter

## Frontend — Floor Map
- [x] Implement DON CONCEPT floor map with exactly 70 numbered tables
- [x] Each table shows number, company name, and guest count
- [x] Color-coded tables: empty, partial, full
- [x] Click table to open detail panel
- [x] Table tooltip on hover showing summary (via aria-label)

## Frontend — Table Detail Panel
- [x] Slide-in panel showing table number, company, and guest list
- [x] Edit company name inline
- [x] Remove individual guest from table
- [x] Add guest manually to table from panel
- [x] Quick reassign guest to another table

## Frontend — Unassigned Guests Sidebar
- [x] List all unassigned guests
- [x] Real-time update as guests are assigned/removed
- [x] Search by name
- [x] Filter by company (grouped by company)
- [x] Drag guest from sidebar to table on map

## Frontend — Drag & Drop
- [x] Drag guest from unassigned sidebar to table
- [x] Drag guest from one table to another (via detail panel)
- [x] Visual feedback during drag (highlight valid drop targets)

## Frontend — Import
- [x] XLS/XLSX file upload UI
- [x] Parse guest name and company columns
- [x] Preview imported guests before confirming
- [x] Handle duplicate detection (via importBatch tracking)

## Frontend — Export
- [x] Export full seating as CSV download
- [x] Export printable PDF view
- [x] Print-friendly layout

## Design & Polish
- [x] Sophisticated editorial aesthetic (cream background, Didone serif)
- [x] Responsive layout (desktop-first)
- [x] Loading states and empty states
- [x] Toast notifications for actions
- [x] Keyboard accessibility

## Capacity Rules
- [x] Tables 10 and 44 capacity = 20; all other 68 tables capacity = 10
- [x] Visual distinction on map for large-capacity tables (10 and 44)

## Layout & UX Improvements (v2)
- [x] Rewrite floorLayout.ts with exact DON CONCEPT PDF positions
- [x] Company name visible on each table in the SVG map
- [x] Zoom in/out buttons with percentage indicator
- [x] Mouse wheel zoom support
- [x] Pan (drag) support on the map canvas
- [x] Touch pan support for mobile
- [x] Tooltip shows full company name + seat count on hover
- [x] Buffet labels, PALCO, PISTA, LOUNGE Integrado on map

## Import XLS — Formato Fixo (v3)
- [x] Parser XLS: coluna 1 = Empresa, coluna 2 = Convidado (sem mapeamento manual)
- [x] Ignorar linha de cabeçalho automaticamente se detectada
- [x] Validação: alertar linhas com empresa ou nome vazio
- [x] UI simplificada: sem step "map", vai direto para preview
- [x] Botão para baixar template XLS de exemplo
- [x] Mostrar contagem de empresas únicas na preview

## Alocação em Grupo por Empresa (v4)
- [x] tRPC bulkAssign: atribuir lista de guestIds a uma tableId com validação de capacidade
- [x] SeatingContext: adicionar draggedCompany (nome + guestIds) para drag de grupo
- [x] UnassignedSidebar: cabeçalho de empresa com ícone de arrastar para drag de grupo
- [x] UnassignedSidebar: contador de convidados por empresa e indicador visual
- [x] FloorMap: aceitar drop de grupo, mostrar overlay de capacidade ao arrastar empresa
- [x] FloorMap: bloquear drop quando convidados > vagas disponíveis na mesa (toast de erro)
- [x] FloorMap: ao soltar empresa na mesa, atribuir companyName automaticamente se mesa estiver vazia
- [x] TableDetailPanel: deixar claro como editar nome da empresa na mesa

## Sugestão de Mesas Vizinhas (v5)
- [x] Algoritmo de mesas vizinhas em floorLayout.ts (distância euclidiana entre posições SVG)
- [x] SuggestNeighborDialog: modal mostrando mesas vizinhas com vagas disponíveis
- [x] Highlight das mesas sugeridas no mapa enquanto o dialog está aberto
- [x] Ação "Distribuir" no dialog: aloca convidados nas mesas sugeridas em sequência
- [x] SeatingContext: estado pendingCompanyDrop para passar dados do drop para o dialog
- [x] Integração no handleDrop do FloorMap: ao falhar por capacidade, abrir dialog de sugestão

## Múltiplas Empresas por Mesa (v6)
- [x] Schema: adicionar coluna companyNames TEXT (JSON array) na tabela tables
- [x] db.ts: addCompanyToTable — acumula empresa no array sem duplicar
- [x] db.ts: removeCompanyFromTable — remove empresa do array
- [x] db.ts: bulkAssignGuests — ao alocar empresa em mesa, chama addCompanyToTable
- [x] routers: expor addCompany e removeCompany procedures
- [x] FloorMap: exibir múltiplas empresas na mesa (truncado com "/ Empresa B")
- [x] TableDetailPanel: listar todas as empresas da mesa com botão de remover cada uma
- [x] Integrar SuggestNeighborDialog no FloorMap (drop com capacidade insuficiente)
- [x] SeatingContext: estado pendingCompanyDrop para passar dados ao dialog
- [x] Highlight das mesas sugeridas no mapa enquanto dialog está aberto

## Mobile / iPad Optimization (v7)
- [x] Layout fiel ao PDF DON CONCEPT — posições pixel-perfect de todas as 70 mesas
- [x] Remover animação CSS de hover nas mesas (transition: none no círculo)
- [x] SeatingManager: layout responsivo desktop/tablet/mobile com useIsMobile
- [x] Sidebar colapsável via botão toggle (PanelLeftOpen/Close) em todas as telas
- [x] Mobile: sidebar como overlay com backdrop, fecha ao clicar fora
- [x] Mobile: painel de detalhes como bottom sheet (55vh) com drag handle
- [x] Pinch-to-zoom no mapa (dois dedos) para iPad/touch
- [x] Header compacto em mobile (texto menor, sem elementos ocultos)
- [x] Zoom controls touch-friendly (botões 32×32px mínimo)
- [x] PALCO, PISTA e LOUNGE reposicionados para corresponder ao PDF

## Novas Funcionalidades (v11)

### Feature 1 — Busca de Empresa no Mapa
- [x] Campo de busca no topo do mapa (toolbar do SeatingManager)
- [x] Ao digitar, destacar em âmbar todas as mesas da empresa encontrada
- [x] Limpar destaque ao apagar o campo
- [x] Busca case-insensitive e parcial
- [x] Mesas não correspondentes ficam com opacidade reduzida (35%)
- [x] Contador de mesas encontradas ao lado do campo

### Feature 2 — Exportar Mapa como PNG
- [x] Instalar html-to-image
- [x] Botão "PNG" na toolbar
- [x] Capturar o container do mapa com todos os nomes de empresa visíveis
- [x] Baixar como arquivo PNG

### Feature 3 — Relatório por Empresa
- [x] Nova rota /relatorio acessível pelo botão "Relatório" na toolbar
- [x] tRPC procedure reports.company: listar empresas com mesas, convidados e totais
- [x] Tabela: Empresa | Mesas | Nº Mesas | Convidados | Capacidade | Ocupação
- [x] Linha expansível: lista de convidados por empresa com número da mesa
- [x] Botão "Exportar PDF" usando jsPDF + jspdf-autotable
- [x] PDF com cabeçalho DON CONCEPT, data e rodapé com página

## Ajuste Manual de Posição/Tamanho das Mesas (v13)
- [x] Schema: adicionar colunas positionX, positionY, radiusOverride (INT nullable) na tabela tables
- [x] db.ts: updateTablePosition(tableId, x, y, radius) helper
- [x] routers: expor tables.updatePosition procedure
- [x] FloorMap: botão "Editar Posições" na toolbar para ativar modo de edição
- [x] FloorMap: no modo de edição, arrastar círculo para mover (sem conflito com pan)
- [x] FloorMap: no modo de edição, controles +/- para ajustar raio do círculo
- [x] FloorMap: salvar posição automaticamente ao soltar o círculo
- [x] FloorMap: usar positionX/positionY do DB quando disponível, fallback para floorLayout.ts
- [x] FloorMap: indicador visual de que está no modo de edição (borda tracejada âmbar, cursor move)
- [x] FloorMap: botão "Resetar" para voltar à posição original do floorLayout.ts
