/**
 * `use:zoomable` — a carta cresce no próprio lugar (com o mouse em cima ou com o foco
 * do teclado/controle) até dar para ler, sem sair da tela. O estilo fica em styles.css (.zoomable).
 */
export function zoomable(node: HTMLElement, opts: { width?: number } = {}) {
  let o = opts;
  const aim = () => {
    const w = node.offsetWidth, h = node.offsetHeight;
    if (!w || !h) return;
    // posição sem a transformação em curso (a carta pode estar no meio de uma animação)
    const box = ((node.offsetParent as HTMLElement | null) ?? node.parentElement!).getBoundingClientRect();
    const sx = (node.offsetParent as HTMLElement | null)?.scrollLeft ?? 0, sy = (node.offsetParent as HTMLElement | null)?.scrollTop ?? 0;
    const cx = box.left + node.offsetLeft - sx + w / 2, cy = box.top + node.offsetTop - sy + h / 2;
    const k = Math.max(1.04, Math.min((o.width ?? 400) / w, (innerHeight - 24) / h));
    const fit = (c: number, half: number, max: number) => Math.min(max - 12 - half, Math.max(12 + half, c)) - c;
    node.style.setProperty('--k', k.toFixed(3));
    node.style.setProperty('--tx', `${fit(cx, (w * k) / 2, innerWidth).toFixed(1)}px`);
    node.style.setProperty('--ty', `${fit(cy, (h * k) / 2, innerHeight).toFixed(1)}px`);
  };
  node.classList.add('zoomable');
  node.addEventListener('mouseenter', aim);
  node.addEventListener('focus', aim);
  return {
    update(next: { width?: number } = {}) { o = next; },
    destroy() { node.removeEventListener('mouseenter', aim); node.removeEventListener('focus', aim); },
  };
}
