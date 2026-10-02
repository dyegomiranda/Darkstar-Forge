/**
 * Void Sun — ponte entre o programa (Electron) e a página.
 * A página não tem Node: só enxerga estas poucas funções (janela, escala, sair).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voidsun', {
  /** Modo da janela: 'windowed' (com largura e altura), 'maximized' ou 'fullscreen'. */
  setDisplay: (o) => ipcRenderer.invoke('vs:display', o),
  /** Escala da interface (1 = 100%). */
  setZoom: (z) => ipcRenderer.invoke('vs:zoom', z),
  /** Tamanho da tela e modo atual da janela. */
  info: () => ipcRenderer.invoke('vs:info'),
  quit: () => ipcRenderer.send('vs:quit'),
  /** Avisa quando o modo muda por fora (F11, botão de maximizar). */
  onMode: (fn) => ipcRenderer.on('vs:mode', (_e, mode) => fn(mode)),
});
