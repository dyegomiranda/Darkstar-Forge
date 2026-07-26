# Progresso do TCG × RPG Studio (Oblivion TCG — nome temp.)

**Última atualização:** 2026-07-25 (pacote A+B robustez)  
**Pasta do projeto:** `/home/djabo/Downloads/Oblivion TCG`  
**Como abrir:** `./ABRIR-TCG-STUDIO` ou abrir `index.html` no navegador  

---

## Como retomar o trabalho

1. Ler este `PROGRESSO.md`.
2. Ver seções **Feito** e **Adiado**.
3. Código + este arquivo = estado do projeto (não depende da conversa no chat).
4. Após mudanças de seed: **Reset seed** no app se o localStorage estiver desatualizado.
5. Atalhos: **Ctrl+S** salva · **Ctrl+Shift+B** restaura backup slim.

---

## Persistência (importante)

| O quê | Onde | Limite |
|-------|------|--------|
| Metadados do projeto (cartas sem base64) | `localStorage` `tcg-studio-v1` | ~5–10 MB típico |
| **Artes de carta, ícones custom, templates, fontes** | **IndexedDB** `tcg-studio-media-v1` | **Centenas de MB** (limite do browser) |
| Backup slim | `tcg-studio-v1-bak1` | 1 cópia |
| Idioma / largura painéis | `tcg-lang`, `tcg-*-panel-w` | pequeno |

- **Sim, salva entre dias** no mesmo navegador/perfil.
- Artes **não** enchem mais o localStorage: refs `idb:art:…` no JSON; bytes no IndexedDB.
- **Exportar JSON** hidrata as artes de volta no arquivo (backup completo portátil).
- Limpar dados do site apaga localStorage **e** IndexedDB.

---

## Feito (resumo)

### Core / storage
- [x] **MediaStore (IndexedDB)** — `js/core/mediaStore.js`
- [x] `Store.saveAsync` / `loadAsync` — slim no LS + media no IDB
- [x] Upload de arte comprimido (max ~1100px, JPEG 0.78)
- [x] Export/import JSON com artes embutidas no export

### Cartas / UI
- [x] Editor, biblioteca, ficha, print, presets, tags, dirty modal 3 botões
- [x] Curva de mana balanceada + seed 50×9 com nomes/regras ricos
- [x] Caixa de regras auto-altura (cresce para cima) + flavor
- [x] Miniaturas da biblioteca = carta completa
- [x] Tipo combo (lista sempre completa)
- [x] Barra de **tipo à frente** das regras + sombra de profundidade
- [x] Filtros de deck + exportar tabela CSV/TSV
- [x] Ícones de classe (Imagine) em `assets/icons/classes/*.jpg`
- [x] Ícones de recurso (Imagine → PNG transparente) em `assets/icons/resources/*.png`
- [x] Recursos: laranja; equipamentos: cor por sinergia de classe
- [x] Raridade comum corrigida (diamante claro + contorno, sem img quebrada)
- [x] Defaults: recurso 40px · ATK/DEF num 34 · ícone combate 40 · classe 56
- [x] Ficha: raça em branco, PV alinhado, print limpa nível/PV/stats

### Launcher
- [x] `ABRIR-TCG-STUDIO` + `LEIA-ME-ABRIR.txt`

---

## Adiado / próximo

1. Motor de combate / simulação (XP, ouro, keywords em jogo)
2. Export PDF em lote com progresso
3. Fontes 100% offline embutidas
4. Multi-personagem na ficha
5. Pipeline de arte por nome (Imagine por carta)
6. Undo/redo · i18n completo do editor · testes automatizados
7. Converter ícones de **classe** JPG → PNG transparente (como recursos)
8. UI de “espaço usado” (IndexedDB quota)

---

## Arquivos-chave

| Arquivo | Função |
|---------|--------|
| `js/core/mediaStore.js` | IndexedDB artes |
| `js/core/store.js` | loadAsync/saveAsync slim |
| `js/render/icons.js` | Classe + recurso + raridade |
| `js/ui/editor.js` | Editor / upload arte |
| `js/ui/library.js` | Filtros / export tabela |
| `js/ui/characterSheet.js` | Ficha |
| `js/data/seed.js` + `seedDecks.js` | Seed |
| `assets/icons/classes/*` | Ícones de classe |
| `assets/icons/resources/*.png` | Ícones de recurso transparentes |
| `PROGRESSO.md` | Este arquivo |

---

## Sessão 2026-07-18 (este lote)

- [x] Storage cheio → IndexedDB para artes (sem limite prático do LS)
- [x] Raridade comum bugada (retângulo preto) → SVG diamante legível
- [x] Recursos sem “círculo” preto: PNG transparente + object-fit contain
- [x] Atualizar este `.md`

**Para o usuário agora:** recarregar com **Ctrl+Shift+R**. Se o storage ainda estiver sujo, **Exportar JSON** primeiro, depois limpar dados do site e **Importar JSON**, ou **Reset seed** e re-adicionar artes (agora no IDB).

---

## Pacote robustez A+B (2026-07-25)

### A — curto prazo
- [x] Thumbs leves por padrão + checkbox **Preview completa**
- [x] GC de mídia órfã + delete limpa IDB; duplicate regrava arte
- [x] Save async com indicador **Salvando…/Salvo** + await nos fluxos críticos
- [x] Biblioteca `assets/artwork` no editor (`manifest.json` + aplicar na carta)
- [x] **Diagnóstico** (LS, IDB, cartas sem arte, decks ≠50, revisões, GC, restaurar revisão)

### B — médio prazo
- [x] `EffectCatalog` + UI de efeitos estruturados no editor
- [x] `classAffinity` em equipamentos (preferido sobre regex)
- [x] Histórico de revisões slim no IndexedDB (até 8)
- [x] **Exportar pack** ZIP (project.json + artes) via ZipUtil store-only
- [x] Fontes offline opcionais: `assets/fonts/local-fonts.css` + README

---

## Limpeza de pastas (2026-07-25)

### Removido (lixo)
- `Ajustes jogo de cartas_files/` (~31 MB)
- `Ajustes-jogo-de-cartas.pdf`
- `_chat_extract.txt`, `Erros para o Grok.txt`
- `_legacy/` (código antigo)
- `assets/icons/resources/*.jpg` (duplicatas; app usa `.png`)
- `assets/icons/ui/tcg-studio.png` (não referenciado)
- `data/scoring-table.json` (não usado; scoring está em `js/data/scoringTable.js`)

### Mantido / reorganizado
- **Ícone do app:** `assets/icons/set/logotcg.png` (movido da raiz; atalho desktop + futuro Tauri)
- **Logo nas cartas (set):** `assets/icons/set/logo.png`
- **Artes do usuário:** `assets/artwork/`
- Referência: `Pathfinder 2e … PT-BR.pdf`, `Explicação sobre o jogo.txt`, `tools/`, `docs/`
