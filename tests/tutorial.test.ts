import { describe, expect, it } from 'vitest';
import { PROTO_DECKS } from '../src/game/decks';
import { apply, heroPos, newGame, reactions, unitAt } from '../src/game/engine';
import { protoEquipment } from '../src/model/equipment';
import { ensureTrainingCard, prepareOpening, trainingBotAction, trainingCards, trainingGame } from '../src/game/tutorial';
import { readTutorial } from '../src/app/tutorial.svelte';
const cards = trainingCards(protoEquipment('test').cards[0]);
const sides = [PROTO_DECKS[0].hero, PROTO_DECKS[1].hero];
describe('treino preparado', () => {
  it('permite invocar, mover, atacar, usar todos os tipos, reagir, subir de nível e evoluir', () => {
    const g = trainingGame(sides[0], sides[1], cards, true);
    const before = JSON.stringify(sides);
    const act = (a: Parameters<typeof apply>[1]) => expect(apply(g, a), JSON.stringify(a)).toBeNull();
    act({t: 'keep', p: 1, discard: []}); act({t: 'keep', p: 0, discard: []});
    const play = (id: string, extra: object = {}) => { const r = g.players[0].hand.find((c) => c.cardId === `tutorial-${id}`)!; act({ t: 'play', uid: r.uid, ...extra }); };
    play('summon', { slot: {p:0,row:0,col:0} });
    act({t:'move',from:{p:0,row:0,col:0},to:{p:0,row:1,col:0}});
    act({t:'strike',target:heroPos(g,1)});
    play('attack',{target:heroPos(g,1)}); play('spell',{target:heroPos(g,1)});
    play('stance'); play('technique'); play('item');
    expect(g.players[0].mana).toBeGreaterThanOrEqual(1);
    act({t:'end'});
    act(trainingBotAction(g,1,false));
    expect(g.pending).toBeDefined(); expect(reactions(g)).toHaveLength(1);
    act({t:'react',uid:reactions(g)[0].uid});
    act(trainingBotAction(g,1,true));
    expect(g.active).toBe(0); expect(g.players[0].pendingLevels).toBeGreaterThan(0);
    act({t:'levelup',choice:'mana'});
    act({t:'attack',from:{p:0,row:1,col:0},target:heroPos(g,1)});
    act({t:'move',from:heroPos(g,0),to:{p:0,row:1,col:1}});
    ensureTrainingCard(g,0,'tutorial-spell'); play('spell',{rank:1,target:heroPos(g,1)});
    expect(g.winner).toBeUndefined(); expect(JSON.stringify(sides)).toBe(before);
    const refs = g.players.flatMap((p)=>[...p.hand,...p.deck,...p.discard,...p.recent]);
    expect(new Set(refs.map((r)=>r.uid)).size).toBe(refs.length);
  });
  it('trocas de mão mantêm cartas de treino válidas e referências únicas', () => {
    const g = trainingGame(sides[0],sides[1],cards,true);
    const total=g.players[0].deck.length+g.players[0].hand.length;
    apply(g,{t:'mulligan',p:0});prepareOpening(g,0);
    expect(g.players[0].hand).toHaveLength(7);
    expect(g.players[0].deck.length+g.players[0].hand.length).toBe(total);
    expect(g.setup!.mull[0]).toBe(1);
    apply(g,{t:'keep',p:1,discard:[]});apply(g,{t:'keep',p:0,discard:[g.players[0].hand[0].uid]});
    ensureTrainingCard(g,0,'tutorial-summon');expect(g.players[0].hand.some((c)=>c.cardId==='tutorial-summon')).toBe(true);
  });
  it('funciona com o instrutor começando e preserva o herói do jogador', () => {
    const g = trainingGame(sides[0],sides[1],cards,false);
    expect(g.players[1].hero.id).toBe(sides[0].id);
    apply(g,{t:'keep',p:0,discard:[]});apply(g,{t:'keep',p:1,discard:[]});
    apply(g,trainingBotAction(g,0,false));expect(reactions(g)).toHaveLength(1);
    apply(g,{t:'pass'});apply(g,trainingBotAction(g,0,true));
    expect(g.active).toBe(1);expect(unitAt(g,heroPos(g,1))!.dmg).toBeLessThan(10);
  });
});
it('dados antigos ou corrompidos do tutorial não quebram o jogo', () => {
  expect(readTutorial('null').preference).toBe('ask');expect(readTutorial('{').steps).toEqual({});
  expect(readTutorial(JSON.stringify({preference:'enabled',steps:{battle:-1,solo:2},finished:[null,'modes']}))).toEqual({preference:'enabled',steps:{solo:2},finished:['modes'],battleStarted:false});
});

it('treino começa no nível 1 com recursos e vida curtos e usa artes da coleção', () => {
  const source = { ...protoEquipment('test').cards[0], art: { mediaId: 'arte-existente', zoom: 1.2, x: 2, y: 3 }, game: { ...cards['tutorial-spell'].game! } };
  const illustrated = trainingCards(source, [source]);
  expect(illustrated['tutorial-spell'].art.mediaId).toBe('arte-existente');
  expect(illustrated['tutorial-spell'].art.zoom).toBe(1.2);
  const g = trainingGame(sides[0], sides[1], illustrated, true);
  expect(g.players.map(p => p.level)).toEqual([1,1]);
  expect(g.players.map(p => p.hero.maxHp)).toEqual([14,14]);
  expect(g.players.map(p => p.maxMana)).toEqual([3,3]);
  expect(g.players.map(p => p.maxVigor)).toEqual([3,3]);
});
