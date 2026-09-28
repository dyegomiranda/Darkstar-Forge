# Darkstar Forge — progresso

**Atualizado:** 28/09/2026 (versão 2.0: programa reescrito do zero)
**Como abrir:** atalho *Darkstar Forge* no menu de aplicativos, ou o script `Darkstar Forge` na pasta.
**Código antigo:** preservado no git na etiqueta `legado-v1`.

## Versão 2.0 (28/09/2026)

### Reescrita
- [x] Vite + TypeScript + Svelte 5 + Electron seguro (protocolo `app://`, sem Node na página)
- [x] Modelo de dados único e versionado. O texto fica só em `text[idioma]`, e cada carta pertence a um deck
- [x] Banco IndexedDB: uma linha por carta, imagens como Blob e sem duplicar a mesma arte
- [x] Salvamento a cada carta alterada. Uma falha não trava os próximos salvamentos (antes travava até reabrir)
- [x] O editor trabalha numa cópia: "Descartar" volta de fato ao que estava salvo (antes não voltava)
- [x] O custo digitado à mão é respeitado (antes a pontuação sobrescrevia)
- [x] Exportação PNG/PDF com fontes e símbolos embutidos (antes saía sem eles)
- [x] Ids de SVG únicos por carta (antes a cor de uma carta vazava para outra)
- [x] Biblioteca com rolagem virtual e imagens em alta resolução guardadas em cache, desenhadas em segundo plano
- [x] Interface nova e responsiva: Biblioteca, Editor (Texto/Jogo/Arte/Aparência), Ficha e Ajustes
- [x] PT/EN em toda a interface e nas cartas
- [x] Testes automáticos (`npm test`)
- [x] Limpeza: cerca de 570 MB de lixo de build e o código antigo removidos

### Visual das cartas
- [x] 6 estilos misturáveis peça a peça: Ornado, Gótico, Arcano (astrolábio), Moderno, Selvagem e Pixel
- [x] Personalização por peça: cor, transparência, metal, cor do texto e fonte
- [x] Moldura em volta da carta opcional (o padrão é full art, sem borda)
- [x] Símbolos de game-icons.net em 4 acabamentos (metal gravado, medalhão, silhueta, pixel), com opções por recurso, classe, ATK e DEF
- [x] ATK/DEF em placas ou com o número no medalhão

## Próximos passos
1. Criar cartas de exemplo fiéis ao Pathfinder 2e (algumas por deck), com a tabela de pontuação revisada
2. Revisar a tabela de mecânicas (pontos) e o recurso de cada deck (ex.: vigor × fúria no vermelho)
3. Artes das cartas de exemplo
4. Motor de regras e simulação (futuro)

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `src/render/compose.ts` | Monta a carta (peças + textos + símbolos) |
| `src/render/elements/*.ts` | Os estilos, peça a peça |
| `src/render/icons/` | Símbolos e acabamentos |
| `src/model/scoring.ts` + `src/data/mechanics.json` | Balanceamento (pontos → custo → raridade) |
| `src/store/project.svelte.ts` | Estado e salvamento |
| `src/ui/editor/TabLook.svelte` | Painel de aparência |
| `mostruario.html` | Página de desenvolvimento com todos os estilos e símbolos |
