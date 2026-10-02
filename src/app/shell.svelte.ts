/** Estado da moldura do jogo: o menu de pausa (Esc) e quem trata o Esc antes dele. */
class Shell {
  /** Menu de pausa aberto. */
  menu = $state(false);
  /** A tela atual tem o seu próprio menu (a partida): o Esc global não abre o de pausa. */
  ownMenu = $state(false);
}
export const shell = new Shell();
