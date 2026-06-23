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
