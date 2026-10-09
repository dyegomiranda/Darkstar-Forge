/** Paletas de luz compartilhadas pelos cenários; sem alterar cores das cartas. */
export interface Lighting { warm: string; shade: string; particle: string; kind: 'motes' | 'snow' | 'embers' | 'none' }
const woodland: Lighting = { warm: '#edc58a', shade: '#304962', particle: '#f3dda0', kind: 'motes' };
const profiles: Record<string, Lighting> = {
  santuario: woodland, floresta: woodland, campo: { ...woodland, shade: '#455b72' },
  vulcao: { warm: '#ec834e', shade: '#392544', particle: '#ffac65', kind: 'embers' },
  neve: { warm: '#c3e1ed', shade: '#445583', particle: '#e7f5ff', kind: 'snow' },
  deserto: { warm: '#f2c68c', shade: '#65566b', particle: '#e7c38b', kind: 'motes' },
  pantano: { warm: '#acc6a3', shade: '#304955', particle: '#bcebad', kind: 'motes' },
  masmorra: { warm: '#d9aa77', shade: '#343954', particle: '#d2baa1', kind: 'motes' },
  cripta: { warm: '#a5bbc7', shade: '#393752', particle: '#bec9e9', kind: 'motes' },
  mesa: { warm: '#c6a57c', shade: '#333047', particle: '#c6a57c', kind: 'none' },
};
export const lightingOf = (scene: string): Lighting => profiles[scene] ?? woodland;
