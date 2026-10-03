import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { apply, emptySlots, heroHp, heroPos, legalActions, newGame, reachable, unitAt, type Side } from '../src/game/engine';
import { botTurn } from '../src/game/bot';
import type { CardDef } from '../src/game/types';

const side = (i: number): Side => {
  const d = PROTO_DECKS[i];
  const cards: CardDef[] = d.cards.map((c, k) => ({ id: `${d.color}-${k}`, name: c.name, game: c.game }));
  return { hero: d.hero, cards };
};

describe('motor', () => {
  it('começa com 7 cartas cada, recursos cheios e XP do 1º turno', () => {
    const s = newGame(side(0), side(1), { seed: 1 });
    expect(s.players[0].hand.length).toBe(7);
    expect(s.players[1].hand.length).toBe(7);
    expect(s.players[0].vigor).toBe(side(0).hero.vigor);
    expect(s.players[0].xp).toBe(1);
  });

  it('corpo a corpo respeita a frente: com alguém na frente, não alcança a retaguarda', () => {
    const s = newGame(side(0), side(1), { seed: 2 }); // Brunhild (frente) × Kael (retaguarda)
    const kael = heroPos(s, 1);
    expect(reachable(s, 0, 'melee', heroPos(s, 0)).some((p) => p.row === kael.row && p.col === kael.col)).toBe(true); // frente vazia: alcança
    s.players[1].board[0][1] = { id: 'w', name: ['Muralha', 'Wall'], atk: 0, def: 4, dmg: 0, keys: ['guarda'], isHero: false, exhausted: true, afflicted: false, marked: false, warded: false, buff: 0 };
    const r = reachable(s, 0, 'melee', heroPos(s, 0));
    expect(r).toEqual([{ p: 1, row: 0, col: 1 }]);
  });

  it('a cada 3 XP sobe um nível e a escolha aumenta o recurso', () => {
    const s = newGame(side(0), side(1), { seed: 3 });
    apply(s, { t: 'end' }); apply(s, { t: 'end' }); // turno 2 de Brunhild: XP 2
    s.players[1].hand = []; // nada a fazer
    apply(s, { t: 'end' }); apply(s, { t: 'end' }); // XP 3 → nível pendente
    expect(s.players[0].pendingLevels).toBe(1);
    expect(apply(s, { t: 'end' })).toMatch(/nível/);
    apply(s, { t: 'levelup', choice: 'vigor' });
    expect(s.players[0].level).toBe(2);
    expect(s.players[0].maxVigor).toBe(side(0).hero.vigor + 1);
  });

  it('invocar ocupa um lugar livre; golpear tira vida', () => {
    const s = newGame(side(3), side(0), { seed: 4 }); // Morgana × Brunhild
    const before = heroHp(s, 1);
    expect(apply(s, { t: 'strike', target: heroPos(s, 1) })).toBeNull();
    if (s.pending) apply(s, { t: 'pass' }); // Brunhild tem uma Reação na mão e aceita o golpe
    // golpe de Morgana (arma + equipamento) menos a armadura de Brunhild
    expect(heroHp(s, 1)).toBe(before - Math.max(1, side(3).hero.weapon.dmg - side(0).hero.armor));
    const free = emptySlots(s, 0).length;
    s.players[0].hand.unshift({ uid: 'x', cardId: 'black-4' }); // Erguer Esqueleto
    s.players[0].mana = 5;
    expect(apply(s, { t: 'play', uid: 'x', slot: { p: 0, row: 0, col: 0 } })).toBeNull();
    expect(unitAt(s, { p: 0, row: 0, col: 0 })?.name[0]).toBe('Esqueleto');
    expect(emptySlots(s, 0).length).toBe(free - 1);
  });

  it('bot contra bot: todas as partidas terminam; mostra as vitórias por herói', () => {
    const wins: Record<string, number> = {};
    const turns: number[] = [];
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      if (a === b) continue;
      for (let seed = 1; seed <= 3; seed++) {
        const s = newGame(side(a), side(b), { seed: seed * 97 + a * 7 + b });
        let guard = 0;
        while (s.winner === undefined && guard++ < 400) {
          expect(legalActions(s).length).toBeGreaterThan(0);
          botTurn(s);
        }
        expect(s.winner, `${a}×${b}#${seed} não terminou`).toBeDefined();
        const w = s.players[s.winner!].hero.name;
        wins[w] = (wins[w] ?? 0) + 1;
        turns.push(s.turn);
      }
    }
    console.log('vitórias (de 18 partidas cada):', wins, '· turnos médios:', (turns.reduce((x, y) => x + y, 0) / turns.length).toFixed(1));
  }, 120000);
});

describe('reações, herói fora do campo e empurrão', () => {
  const findUid = (s: ReturnType<typeof newGame>, p: 0 | 1, name: string) => {
    const pl = s.players[p];
    const pool = [...pl.hand, ...pl.deck];
    const ref = pool.find((c) => s.defs[c.cardId].name[0] === name)!;
    if (!pl.hand.includes(ref)) { pl.deck.splice(pl.deck.indexOf(ref), 1); pl.hand.push(ref); }
    return ref.uid;
  };

  it('Contramágica anula a Magia do oponente e gasta a Mana de quem reage', () => {
    const s = newGame(side(3), side(1), { seed: 5 }); // Morgana × Kael
    const curse = findUid(s, 0, 'Maldição da Ruína');
    findUid(s, 1, 'Contramágica');
    expect(apply(s, { t: 'play', uid: curse, target: heroPos(s, 1) })).toBeNull();
    expect(s.pending).toBeTruthy(); // Kael pode responder
    const react = legalActions(s).find((a) => a.t === 'react')!;
    expect(apply(s, react)).toBeNull();
    expect(s.pending).toBeUndefined();
    expect(unitAt(s, heroPos(s, 1))!.afflicted).toBe(false); // a maldição não fez efeito
    expect(s.players[1].mana).toBe(s.players[1].maxMana - 2);
  });

  it('sem Reação que sirva, a carta resolve na hora', () => {
    const s = newGame(side(3), side(0), { seed: 6 }); // Morgana × Brunhild (Aparar só responde a Ataque)
    const curse = findUid(s, 0, 'Maldição da Ruína');
    findUid(s, 1, 'Aparar');
    apply(s, { t: 'play', uid: curse, target: heroPos(s, 1) });
    expect(s.pending).toBeUndefined();
    expect(unitAt(s, heroPos(s, 1))!.afflicted).toBe(true);
  });

  it('herói fora do campo: não ocupa lugar; com a regra opcional, o corpo a corpo só passa com a frente vazia', () => {
    const s = newGame(side(0), side(1), { seed: 7, heroOff: true, heroOffFront: true });
    expect(emptySlots(s, 1).length).toBe(6);
    expect(heroPos(s, 1).row).toBe(-1);
    expect(reachable(s, 0, 'melee', heroPos(s, 0)).some((p) => p.row === -1)).toBe(true);
    s.players[1].board[0][0] = { id: 'w', name: ['Muralha', 'Wall'], atk: 0, def: 4, dmg: 0, keys: [], isHero: false, exhausted: true, afflicted: false, marked: false, warded: false, buff: 0 };
    expect(reachable(s, 0, 'melee', heroPos(s, 0)).some((p) => p.row === -1)).toBe(false);
    expect(legalActions(s).some((a) => a.t === 'move')).toBe(false);
  });

  it('empurrar muda o herói inimigo de fileira', () => {
    const s = newGame(side(1), side(0), { seed: 8 }); // Kael × Brunhild (na frente)
    const ray = findUid(s, 0, 'Raio de Gelo');
    s.players[1].hand = [];
    const before = heroPos(s, 1);
    expect(before.row).toBe(0);
    expect(apply(s, { t: 'play', uid: ray, target: before })).toBeNull();
    expect(heroPos(s, 1).row).toBe(1);
  });
});

describe('herói fora do campo: golpe livre', () => {
  it('golpeia qualquer fileira e o herói inimigo; com a regra opcional, só com a frente vazia', () => {
    const wall = { id: 'w', name: ['Muralha', 'Wall'] as [string, string], atk: 0, def: 4, dmg: 0, keys: [], isHero: false, exhausted: true, afflicted: false, marked: false, warded: false, buff: 0 };
    const free = newGame(side(0), side(1), { seed: 9, heroOff: true });
    free.players[1].board[0][0] = { ...wall };
    free.players[1].board[1][2] = { ...wall, id: 'b' };
    const r = reachable(free, 0, 'melee', heroPos(free, 0));
    expect(r.some((p) => p.row === -1)).toBe(true);
    expect(r.some((p) => p.row === 1)).toBe(true);
    const strict = newGame(side(0), side(1), { seed: 9, heroOff: true, heroOffFront: true });
    strict.players[1].board[0][0] = { ...wall };
    expect(reachable(strict, 0, 'melee', heroPos(strict, 0))).toEqual([{ p: 1, row: 0, col: 0 }]);
  });
});

describe('mão inicial (mulligan)', () => {
  it('troca recebe 7 de novo; ao ficar, descarta 1 por troca; o turno só começa quando os dois ficam', () => {
    const s = newGame(side(0), side(1), { seed: 11, mulligan: true });
    expect(s.setup).toBeTruthy();
    expect(s.players[0].xp).toBe(0); // o 1º turno ainda não começou
    expect(apply(s, { t: 'mulligan', p: 0 })).toBeNull();
    expect(apply(s, { t: 'mulligan', p: 0 })).toBeNull();
    expect(s.players[0].hand.length).toBe(7);
    expect(apply(s, { t: 'keep', p: 0, discard: [] })).toMatch(/2 cartas/);
    const two = s.players[0].hand.slice(0, 2).map((c) => c.uid);
    expect(apply(s, { t: 'keep', p: 0, discard: two })).toBeNull();
    expect(s.players[0].hand.length).toBe(5);
    expect(s.players[0].deck.length).toBe(35);
    expect(s.setup).toBeTruthy();
    expect(apply(s, { t: 'keep', p: 1, discard: [] })).toBeNull();
    expect(s.setup).toBeUndefined();
    expect(s.players[0].xp).toBe(1);
  });

  it('no máximo 3 trocas', () => {
    const s = newGame(side(0), side(1), { seed: 12, mulligan: true });
    for (let i = 0; i < 3; i++) expect(apply(s, { t: 'mulligan', p: 1 })).toBeNull();
    expect(apply(s, { t: 'mulligan', p: 1 })).toMatch(/3 vezes/);
  });
});

describe('desistir', () => {
  it('quem desiste (ou estoura o tempo) perde, em qualquer momento', () => {
    const s = newGame(side(0), side(1), { seed: 13, mulligan: true });
    expect(apply(s, { t: 'concede', p: 1 })).toBeNull();
    expect(s.winner).toBe(0);
    expect(s.ended).toBe('concede');
    const t = newGame(side(0), side(1), { seed: 14 });
    apply(t, { t: 'concede', p: 0, timeout: true });
    expect(t.winner).toBe(1);
    expect(t.ended).toBe('timeout');
  });
});

describe('reagir a ataques que não são cartas', () => {
  const give = (s: ReturnType<typeof newGame>, p: 0 | 1, name: string) => {
    const pl = s.players[p];
    const ref = [...pl.hand, ...pl.deck].find((c) => s.defs[c.cardId].name[0] === name)!;
    if (!pl.hand.includes(ref)) { pl.deck.splice(pl.deck.indexOf(ref), 1); pl.hand.push(ref); }
    return ref.uid;
  };
  it('o golpe básico do herói inimigo abre a resposta; Esquiva protege o herói', () => {
    const s = newGame(side(1), side(2), { seed: 21 }); // Kael golpeia (mágico) × Lyra com Esquiva
    give(s, 1, 'Esquiva');
    const before = heroHp(s, 1);
    expect(apply(s, { t: 'strike', target: heroPos(s, 1) })).toBeNull();
    expect(s.pending?.attack).toBe('strike');
    expect(heroHp(s, 1)).toBe(before); // ainda não acertou
    const react = legalActions(s).find((a) => a.t === 'react')!;
    expect(apply(s, react)).toBeNull();
    expect(s.pending).toBeUndefined();
    expect(heroHp(s, 1)).toBe(before); // a Proteção anulou o golpe
    expect(s.players[0].struck).toBe(true);
  });
  it('sem Reação na mão, o golpe acerta na hora', () => {
    const s = newGame(side(1), side(2), { seed: 22 });
    s.players[1].hand = s.players[1].hand.filter((c) => s.defs[c.cardId].game.kind !== 'reacao');
    const before = heroHp(s, 1);
    apply(s, { t: 'strike', target: heroPos(s, 1) });
    expect(s.pending).toBeUndefined();
    expect(heroHp(s, 1)).toBeLessThan(before);
  });
});
