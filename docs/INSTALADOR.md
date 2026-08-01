# Darkstar Forge — instaladores (Windows e Linux)

Seu amigo **não precisa digitar nenhum comando**.  
Ele só **baixa o instalador** e **dá dois cliques**.

## Onde baixar

Na página **Releases** do repositório GitHub:

```
https://github.com/dyegomiranda/Darkstar-Forge/releases
```

Arquivos típicos:

| Arquivo | Plataforma | O que fazer |
|---------|------------|-------------|
| `Darkstar Forge Setup 1.0.0.exe` (ou similar) | Windows | Duplo clique → instalar |
| `Darkstar Forge-1.0.0.AppImage` | Linux | Marcar executável (se pedir) → duplo clique |
| `darkstar-forge_1.0.0_amd64.deb` (ou similar) | Linux (Debian/Ubuntu) | Duplo clique no instalador de pacotes |

Na primeira execução no Windows, o sistema pode instalar o **WebView2** (Microsoft) se ainda não existir (dependendo da versão do Electron / instalador).

## Dados do usuário (artes, cartas, símbolos)

Ficam salvos no **perfil do aplicativo** (IndexedDB + armazenamento local):

- Upload de artes → biblioteca reutilizável  
- Cartas, decks, ícones custom, símbolo do set  
- Exportar JSON / pack = backup portátil  

## Como as builds são geradas (para você, desenvolvedor)

O app desktop usa **Electron** + **electron-builder**.  
O workflow GitHub Actions (`.github/workflows/release.yml`) gera os instaladores em cada tag `v*`.

### Publicar uma versão

```bash
git tag v1.0.0
git push origin v1.0.0
```

Ou: GitHub → Actions → **Release installers (Electron)** → Run workflow.

Os artefatos aparecem na Release e em *Artifacts* do job.

### Build local (só se você quiser testar)

**Windows** (gera o instalador NSIS `.exe`):

```bat
npm install
npm run build:windows
```

Saída: pasta `release/`

**Linux** (AppImage + `.deb`):

```bash
npm install
npm run build:linux
```

Saída: pasta `release/`

**Ambos** (em máquina com toolchain adequada):

```bash
npm install
npm run build:all
```

### Desenvolvimento (Electron)

```bash
npm install
npm run electron
```

### Desenvolvimento (web no browser)

```bash
./Darkstar\ Forge
# ou:
npm run dev:web
```

> O instalador Windows **não** é gerado neste Linux de forma confiável em todos os ambientes — use o GitHub Actions ou um PC Windows.
