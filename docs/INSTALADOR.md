# Darkstar Forge — instaladores (Windows e Linux)

Seu amigo **não precisa digitar nenhum comando**.  
Ele só **baixa o instalador** e **dá dois cliques**.

## Onde baixar

Na página **Releases** do repositório GitHub:

```
https://github.com/<SEU_USUARIO>/darkstar-forge/releases
```

Arquivos típicos:

| Arquivo | Plataforma | O que fazer |
|---------|------------|-------------|
| `Darkstar.Forge_1.0.0_x64-setup.exe` | Windows | Duplo clique → instalar (usuário atual; sem admin) |
| `Darkstar.Forge_1.0.0_amd64.AppImage` | Linux | Marcar executável (se pedir) → duplo clique |
| `Darkstar.Forge_1.0.0_amd64.deb` | Linux (Debian/Ubuntu) | Duplo clique no instalador de pacotes |

Na primeira execução no Windows, o sistema pode instalar o **WebView2** (Microsoft) se ainda não existir.

## Dados do usuário (artes, cartas, símbolos)

Ficam salvos no **perfil do aplicativo** (IndexedDB + armazenamento local):

- Upload de artes → biblioteca reutilizável  
- Cartas, decks, ícones custom, símbolo do set  
- Exportar JSON / pack = backup portátil  

## Como as builds são geradas (para você, desenvolvedor)

O workflow GitHub Actions (`.github/workflows/release.yml`) gera os instaladores em cada tag `v*`.

### Publicar uma versão

```bash
git tag v1.0.0
git push origin v1.0.0
```

Ou: GitHub → Actions → **Release installers** → Run workflow.

Os artefatos aparecem na Release e em *Artifacts* do job.

### Build local (só se você quiser testar)

**Windows** (gera o `.exe` setup):

```bat
npm install
npm run tauri:build
```

Saída: `src-tauri\target\release\bundle\nsis\`

**Linux**:

```bash
npm install
npm run tauri:build
```

Saída: `src-tauri/target/release/bundle/`

> O instalador Windows **não** é gerado neste Linux — use o GitHub Actions ou um PC Windows.
