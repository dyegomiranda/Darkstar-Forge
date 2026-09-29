"""
Gera src/data/pf-cards.json — a coleção "Classes" (fiel ao Pathfinder 2e).

Cada carta declara as mecânicas que o texto dela faz. A pontuação (a mesma do
app: 1 ponto grátis, +1 de custo a cada 2 pontos) dá o custo sugerido; o custo
real sai da raridade: comum = sugerido, incomum −1, rara −2, única −3.
Todos os decks têm a mesma distribuição (4 comuns, 3 incomuns, 1 rara, 1 única).

Rodar:  python3 tools/pf-cards.py
"""
import json, math, os, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MECH = {m['id']: m['points'] for m in json.load(open(os.path.join(ROOT, 'src/data/mechanics.json')))}
OFF = {'common': 0, 'uncommon': 1, 'rare': 2, 'unique': 3}
TYPES = {'Criatura': 'Creature', 'Ação': 'Action', 'Habilidade': 'Ability', 'Magia': 'Spell', 'Encantamento': 'Enchantment',
         'Aliado': 'Ally', 'Mercenário': 'Mercenary', 'Recurso': 'Resource', 'Equipamento': 'Equipment'}
DECKS = {'red': 'vigor', 'blue': 'mana', 'green': 'nature', 'black': 'souls', 'purple': 'shadow', 'white': 'faith', 'silver': 'focus', 'resources': 'gold', 'equipment': 'gold'}
COLOR = {'resources': 'orange', 'equipment': 'gear'}

cards = []
def c(deck, rarity, name, typ, sub, rules, flavor, mech, stats=None, tags=()):
    """name/sub/rules/flavor = (pt, en)."""
    score = max(0, sum(MECH[m] for m in mech) + (stats[0] + stats[1] if stats else 0))
    sug = 0 if score <= 1 else math.ceil((score - 1) / 2)
    cost = sug - OFF[rarity]
    assert cost >= 0, (name, sug, rarity)
    cards.append(dict(deck=deck, colors=[COLOR.get(deck, deck)], rarity=rarity, score=score, suggested=sug,
        text={'pt-BR': dict(name=name[0], type=typ, subtype=sub[0], rules=rules[0], flavor=flavor[0]),
              'en-US': dict(name=name[1], type=TYPES[typ], subtype=sub[1], rules=rules[1], flavor=flavor[1])},
        cost=dict(resource=DECKS[deck], amount=cost), stats=dict(atk=stats[0], def_=stats[1]) if stats else None,
        mechanics=list(mech), tags=list(tags)))

# ═══════════ VERMELHO — Guerreiro / Bárbaro ═══════════
c('red', 'common', ('Corte Duplo', 'Double Slice'), 'Ação', ('Guerreiro · Ataque', 'Fighter · Strike'),
  ('Ataque com as duas armas: cause 2 de dano a um alvo e 1 de dano a um alvo (pode ser o mesmo).',
   'Strike with both weapons: deal 2 damage to a target and 1 damage to a target (it may be the same one).'),
  ('Uma lâmina abre a guarda. A outra entra.', 'One blade opens the guard. The other goes in.'), ['damage_2', 'flurry'], tags=['action'])
c('red', 'common', ('Golpe Feroz', 'Vicious Swing'), 'Ação', ('Guerreiro · Ataque', 'Fighter · Strike'),
  ('Cause 4 de dano a uma criatura. Depois disso, você não pode atacar de novo neste turno.',
   'Deal 4 damage to a creature. After that, you can’t attack again this turn.'),
  ('Todo o peso do corpo num único arco.', 'The whole body’s weight in a single arc.'), ['damage_2', 'power_attack'], tags=['action'])
c('red', 'common', ('Investida Súbita', 'Sudden Charge'), 'Ação', ('Bárbaro · Movimento', 'Barbarian · Move'),
  ('Uma criatura sua ganha Ímpeto e +1 ATK e ataca agora. Se ela destruir quem a bloqueou, ganhe 1 {fury}.',
   'A creature of yours gains Haste and +1 ATK and attacks now. If it destroys its blocker, gain 1 {fury}.'),
  ('Duas passadas e o choque.', 'Two strides and the impact.'), ['charge', 'gain_fury_1'], tags=['action'])
c('red', 'common', ('Fúria', 'Rage'), 'Habilidade', ('Bárbaro · Postura', 'Barbarian · Stance'),
  ('Ganhe 2 {fury}. Até o fim do seu próximo turno, seus ataques causam +1 de dano. No fim de cada turno seu em Fúria, perca 1 PV.',
   'Gain 2 {fury}. Until the end of your next turn, your attacks deal +1 damage. At the end of each of your turns in Rage, lose 1 HP.'),
  ('O mundo fica vermelho — e simples.', 'The world turns red — and simple.'), ['gain_fury_2', 'pump_1', 'self_damage'], tags=['ability'])
c('red', 'uncommon', ('Erguer o Escudo', 'Raise a Shield'), 'Ação', ('Guerreiro · Reação', 'Fighter · Reaction'),
  ('Reação: quando você ou uma criatura sua for sofrer dano, previna até 3 desse dano. Se prevenir todo o dano, compre 1 carta.',
   'Reaction: when you or a creature of yours would take damage, prevent up to 3 of it. If you prevent all of it, draw 1 card.'),
  ('O escudo não é abrigo. É uma parede que anda.', 'A shield isn’t shelter. It’s a wall that walks.'), ['shield_block', 'reaction', 'draw_1'], tags=['action'])
c('red', 'uncommon', ('Sentinela Veterana', 'Veteran Sentinel'), 'Criatura', ('Humana · Guerreira', 'Human · Fighter'),
  ('Vigilância. Ataque Reativo: uma vez por turno, quando um inimigo ataca perto dela, ela golpeia primeiro com o próprio ATK.',
   'Vigilance. Reactive Strike: once per turn, when an enemy attacks near her, she strikes first with her own ATK.'),
  ('Quem passa por ela, passa ferido.', 'Whoever gets past her gets past bleeding.'), ['vigilance', 'reactive_strike'], (2, 3), ['creature'])
c('red', 'uncommon', ('Berserker do Clã', 'Clan Berserker'), 'Criatura', ('Humano · Bárbaro', 'Human · Barbarian'),
  ('Ímpeto. Atropelar.', 'Haste. Trample.'),
  ('Ele não sabe o nome do inimigo. Só o caminho até ele.', 'He doesn’t know the enemy’s name. Only the way to him.'), ['haste', 'trample'], (3, 2), ['creature'])
c('red', 'rare', ('Final Furioso', 'Furious Finisher'), 'Ação', ('Bárbaro · Ataque', 'Barbarian · Strike'),
  ('Gaste toda a sua {fury}: cause 2 de dano mais 2 para cada {fury} gasta a uma criatura ou ao oponente. Sua Fúria termina.',
   'Spend all your {fury}: deal 2 damage plus 2 per {fury} spent to a creature or the opponent. Your Rage ends.'),
  ('Tudo o que restava, num único golpe.', 'Everything that was left, in a single blow.'), ['damage_4', 'spend_fury'], tags=['action'])
c('red', 'unique', ('Brunhild, a Inquebrável', 'Brunhild the Unbroken'), 'Criatura', ('Lendária · Humana · Bárbara', 'Legendary · Human · Barbarian'),
  ('Atropelar. Ataque Reativo. Sempre que Brunhild sofrer dano e sobreviver, ganhe 1 {fury}.',
   'Trample. Reactive Strike. Whenever Brunhild takes damage and survives, gain 1 {fury}.'),
  ('Cada cicatriz foi um inimigo que não voltou para casa.', 'Every scar was an enemy who never went home.'),
  ['trample', 'reactive_strike', 'gain_fury_1'], (4, 4), ['creature', 'legendary'])

# ═══════════ AZUL — Mago / Feiticeiro ═══════════
c('blue', 'common', ('Dardos de Força', 'Force Darts'), 'Magia', ('Mago · Força', 'Wizard · Force'),
  ('Cause 2 de dano, divididos como quiser entre até dois alvos. Não erra: ignora Resistência. Se destruir uma criatura, Preveja 2.',
   'Deal 2 damage divided as you choose among up to two targets. It never misses: ignores Resistance. If it destroys a creature, Scry 2.'),
  ('Não se esquiva de uma certeza.', 'You can’t dodge a certainty.'), ['damage_2', 'pierce', 'scry_2'], tags=['spell'])
c('blue', 'common', ('Bola de Fogo', 'Fireball'), 'Magia', ('Mago · Fogo', 'Wizard · Fire'),
  ('Cause 3 de dano a cada criatura inimiga.', 'Deal 3 damage to each enemy creature.'),
  ('Um grão de luz, depois o sol inteiro.', 'A grain of light, then the whole sun.'), ['damage_3', 'aoe_damage'], tags=['spell'])
c('blue', 'common', ('Contramágica', 'Counterspell'), 'Magia', ('Mago · Reação', 'Wizard · Reaction'),
  ('Reação: anule uma magia enquanto ela é lançada. Depois, Preveja 2.',
   'Reaction: counter a spell as it is being cast. Then Scry 2.'),
  ('— Não. — disse ela, e o mundo obedeceu.', '“No,” she said, and the world obeyed.'), ['counterspell', 'reaction', 'scry_2'], tags=['spell'])
c('blue', 'common', ('Coruja do Grimório', 'Grimoire Owl'), 'Criatura', ('Familiar', 'Familiar'),
  ('Voo. Familiar: não ataca. No início do seu turno, Preveja 2.',
   'Flying. Familiar: doesn’t attack. At the start of your turn, Scry 2.'),
  ('Lê por cima do seu ombro. E corrige.', 'It reads over your shoulder. And corrects you.'), ['flying', 'familiar', 'scry_2'], (0, 1), ['creature'])
c('blue', 'uncommon', ('Raio de Gelo', 'Ray of Frost'), 'Magia', ('Mago · Truque', 'Wizard · Cantrip'),
  ('Cause 1 de dano a uma criatura. Truque: no fim do turno, pague 1 {mana} para devolver esta carta à mão.',
   'Deal 1 damage to a creature. Cantrip: at end of turn, pay 1 {mana} to return this card to your hand.'),
  ('A primeira magia que se aprende. A última que se esquece.', 'The first spell you learn. The last you forget.'), ['damage_1', 'cantrip'], tags=['spell'])
c('blue', 'uncommon', ('Escudo Arcano', 'Arcane Shield'), 'Magia', ('Mago · Truque · Reação', 'Wizard · Cantrip · Reaction'),
  ('Reação: uma criatura sua (ou você) ganha +2 DEF até o início do seu próximo turno. Truque.',
   'Reaction: a creature of yours (or you) gains +2 DEF until the start of your next turn. Cantrip.'),
  ('Um lampejo azul, e a lâmina escorrega.', 'A blue flicker, and the blade slides off.'), ['arcane_armor', 'reaction', 'cantrip'], tags=['spell'])
c('blue', 'uncommon', ('Sangue Dracônico', 'Draconic Blood'), 'Encantamento', ('Feiticeiro · Linhagem', 'Sorcerer · Bloodline'),
  ('Sua primeira magia de dano em cada turno causa +1. Você tem Resistência 1.',
   'Your first damage spell each turn deals +1. You have Resistance 1.'),
  ('Ninguém ensinou. Ela simplesmente lembrou.', 'Nobody taught her. She simply remembered.'), ['permanent_buff_1', 'resistance'], tags=['enchantment'])
c('blue', 'rare', ('Surto de Sangue', 'Blood Surge'), 'Magia', ('Feiticeiro · Magia de Sangue', 'Sorcerer · Blood Magic'),
  ('Cause 3 de dano a um alvo e ganhe 1 {mana}. Você perde 1 PV.',
   'Deal 3 damage to a target and gain 1 {mana}. You lose 1 HP.'),
  ('O poder não vem de livros. Vem das veias.', 'The power doesn’t come from books. It comes from the veins.'), ['damage_3', 'gain_resource_1', 'self_damage'], tags=['spell'])
c('blue', 'unique', ('Seraphine, Arquimaga', 'Seraphine, Archmage'), 'Criatura', ('Lendária · Humana · Maga', 'Legendary · Human · Wizard'),
  ('Quando Seraphine entra, compre 2 cartas. Seus Truques voltam à mão sem precisar pagar.',
   'When Seraphine enters, draw 2 cards. Your Cantrips return to your hand without paying.'),
  ('Sete círculos estudados. Nenhum deles a contém.', 'Seven circles mastered. None of them can hold her.'), ['draw_2', 'cantrip'], (2, 3), ['creature', 'legendary'])

# ═══════════ VERDE — Druida / Patrulheiro ═══════════
c('green', 'common', ('Caçar Presa', 'Hunt Prey'), 'Habilidade', ('Patrulheiro', 'Ranger'),
  ('Marque uma criatura inimiga como sua Presa: seus ataques e efeitos contra ela causam +1 até ela morrer. Quando ela morrer, compre 1 carta.',
   'Mark an enemy creature as your Prey: your attacks and effects against it deal +1 until it dies. When it dies, draw 1 card.'),
  ('Rastro, cheiro, silêncio. Depois, a flecha.', 'Track, scent, silence. Then, the arrow.'), ['hunt_prey', 'draw_1'], tags=['ability'])
c('green', 'common', ('Disparo Duplo', 'Twin Shot'), 'Ação', ('Patrulheiro · Ataque', 'Ranger · Strike'),
  ('Cause 1 de dano duas vezes (alvos iguais ou diferentes). Se os dois acertarem sua Presa, cause mais 1.',
   'Deal 1 damage twice (same or different targets). If both hit your Prey, deal 1 more.'),
  ('A segunda flecha já estava no ar.', 'The second arrow was already in the air.'), ['damage_2', 'flurry'], tags=['action'])
c('green', 'common', ('Lobo Companheiro', 'Wolf Companion'), 'Criatura', ('Fera · Companheiro', 'Beast · Companion'),
  ('Quando o Lobo causar dano a uma criatura, ela fica Caída: não bloqueia neste turno.',
   'When the Wolf deals damage to a creature, it is knocked Prone: it can’t block this turn.'),
  ('Ele não caça por você. Caça com você.', 'He doesn’t hunt for you. He hunts with you.'), ['trip'], (2, 2), ['creature'])
c('green', 'common', ('Flora Enredante', 'Entangling Flora'), 'Magia', ('Druida · Planta', 'Druid · Plant'),
  ('Criaturas inimigas não podem atacar no próximo turno delas.', 'Enemy creatures can’t attack during their next turn.'),
  ('A floresta decide quem passa.', 'The forest decides who passes.'), ['entangle'], tags=['spell'])
c('green', 'uncommon', ('Armadilha de Laço', 'Snare'), 'Ação', ('Patrulheiro · Armadilha · Reação', 'Ranger · Trap · Reaction'),
  ('Reação: quando uma criatura inimiga atacar, ela sofre 1 de dano e fica Imobilizada; o ataque é cancelado.',
   'Reaction: when an enemy creature attacks, it takes 1 damage and becomes Immobilized; the attack is cancelled.'),
  ('Uma corda, um galho, um passo errado.', 'A rope, a branch, one wrong step.'), ['control', 'reaction', 'damage_1'], tags=['action'])
c('green', 'uncommon', ('Forma Indomável', 'Untamed Form'), 'Magia', ('Druida · Polimorfia', 'Druid · Polymorph'),
  ('Até o fim do seu próximo turno, você se torna uma fera 3/3 com Atropelar que pode atacar e bloquear como uma criatura.',
   'Until the end of your next turn, you become a 3/3 beast with Trample that can attack and block like a creature.'),
  ('A pele se abre em pelo; a voz, em rugido.', 'Skin splits into fur; voice, into a roar.'), ['beast_form', 'trample'], tags=['spell'])
c('green', 'uncommon', ('Guardião Leshy', 'Leshy Warden'), 'Criatura', ('Planta · Ordem da Folha', 'Plant · Leaf Order'),
  ('Alcance. Regenerar 1.', 'Reach. Regenerate 1.'),
  ('Brotou onde um herói caiu. E ficou de guarda.', 'It sprouted where a hero fell. And stood watch.'), ['reach', 'regenerate_1'], (1, 3), ['creature'])
c('green', 'rare', ('Fúria da Tempestade', 'Tempest Surge'), 'Magia', ('Druida · Ordem da Tempestade', 'Druid · Storm Order'),
  ('Cause 3 de dano a uma criatura e 1 de dano a cada outra criatura inimiga.',
   'Deal 3 damage to a creature and 1 damage to each other enemy creature.'),
  ('O céu também tem dentes.', 'The sky has teeth too.'), ['damage_3', 'aoe_damage'], tags=['spell'])
c('green', 'unique', ('Thessaly, Voz do Bosque', 'Thessaly, Voice of the Grove'), 'Criatura', ('Lendária · Elfa · Druida', 'Legendary · Elf · Druid'),
  ('Alcance. Quando Thessaly entra, ponha em jogo um Companheiro animal 2/2. Suas criaturas têm Regenerar 1.',
   'Reach. When Thessaly enters, put a 2/2 animal Companion into play. Your creatures have Regenerate 1.'),
  ('Onde ela pisa, a primavera volta.', 'Where she walks, spring returns.'), ['reach', 'companion', 'regenerate_1'], (3, 4), ['creature', 'legendary'])

# ═══════════ PRETO — Necromante / Bruxo ═══════════
c('black', 'common', ('Toque Vampírico', 'Vampiric Touch'), 'Magia', ('Necromante · Vazio', 'Necromancer · Void'),
  ('Cause 2 de dano a uma criatura. Você recupera PV iguais ao dano causado.',
   'Deal 2 damage to a creature. You regain HP equal to the damage dealt.'),
  ('O calor dele agora é seu.', 'His warmth is yours now.'), ['damage_2', 'drain'], tags=['spell'])
c('black', 'common', ('Erguer Esqueleto', 'Raise Skeleton'), 'Magia', ('Necromante', 'Necromancer'),
  ('Ponha em jogo um Esqueleto 1/1. Se uma criatura morreu neste turno, ponha dois.',
   'Put a 1/1 Skeleton into play. If a creature died this turn, put two instead.'),
  ('Ossos não reclamam de horas extras.', 'Bones never complain about overtime.'), ['summon'], tags=['spell'])
c('black', 'common', ('Carniçal Faminto', 'Ravenous Ghoul'), 'Criatura', ('Morto-vivo', 'Undead'),
  ('Quando causar dano a uma criatura, ela fica Paralisada: não ataca nem bloqueia no próximo turno.',
   'When it deals damage to a creature, that creature is Paralyzed: it can’t attack or block next turn.'),
  ('A fome dele congela o sangue antes de bebê-lo.', 'Its hunger freezes the blood before drinking it.'), ['control'], (2, 1), ['creature'])
c('black', 'common', ('Mau-Olhado', 'Evil Eye'), 'Magia', ('Bruxo · Sortilégio', 'Witch · Hex'),
  ('A criatura alvo recebe −1/−1 enquanto você Sustentar (pague 1 {souls} no início do seu turno). Só um Sortilégio por turno.',
   'Target creature gets −1/−1 while you Sustain it (pay 1 {souls} at the start of your turn). Only one Hex per turn.'),
  ('Um olhar. Só isso. Por enquanto.', 'One look. That’s all. For now.'), ['curse', 'sustain'], tags=['spell'])
c('black', 'uncommon', ('Colheita de Almas', 'Soul Harvest'), 'Encantamento', ('Necromante', 'Necromancer'),
  ('Quando entra, compre 1 carta. Sempre que uma criatura morrer, ganhe 1 {souls} (no máximo 2 por turno).',
   'When it enters, draw 1 card. Whenever a creature dies, gain 1 {souls} (at most 2 per turn).'),
  ('Nada se perde. Tudo se recolhe.', 'Nothing is lost. Everything is gathered.'), ['soul_harvest', 'draw_1'], tags=['enchantment'])
c('black', 'uncommon', ('Reanimar', 'Reanimate'), 'Magia', ('Necromante', 'Necromancer'),
  ('Custo adicional: sacrifique uma criatura sua. Traga de volta ao jogo uma criatura do seu cemitério.',
   'Additional cost: sacrifice a creature of yours. Return a creature from your graveyard to play.'),
  ('Uma vida por outra. A morte é boa de contas.', 'A life for a life. Death keeps good books.'), ['reanimate', 'sacrifice'], tags=['spell'])
c('black', 'uncommon', ('Gato do Patrono', 'Patron’s Cat'), 'Criatura', ('Familiar', 'Familiar'),
  ('Familiar. Quando entra, o oponente descarta 1 carta.', 'Familiar. When it enters, the opponent discards 1 card.'),
  ('Ele leva recados. De quem, ninguém pergunta.', 'It carries messages. From whom, no one asks.'), ['familiar', 'discard'], (1, 1), ['creature'])
c('black', 'rare', ('Palavra Final do Patrono', 'Patron’s Final Word'), 'Magia', ('Bruxo · Sortilégio', 'Witch · Hex'),
  ('Destrua uma criatura.', 'Destroy a creature.'),
  ('O patrono não grita. Só termina a frase.', 'The patron doesn’t shout. It just finishes the sentence.'), ['destroy'], tags=['spell'])
c('black', 'unique', ('Morwen, a Rainha Cinzenta', 'Morwen, the Ashen Queen'), 'Criatura', ('Lendária · Humana · Necromante', 'Legendary · Human · Necromancer'),
  ('Vampirismo. Sempre que outra criatura morrer, ganhe 1 {souls} e ponha em jogo um Esqueleto 1/1.',
   'Lifelink. Whenever another creature dies, gain 1 {souls} and put a 1/1 Skeleton into play.'),
  ('Seu reino não tem vivos. Não precisa.', 'Her kingdom has no living. It doesn’t need them.'), ['lifelink', 'soul_harvest', 'summon'], (3, 3), ['creature', 'legendary'])

# ═══════════ ROXO — Ladino / Assassino ═══════════
c('purple', 'common', ('Ataque Furtivo', 'Sneak Attack'), 'Ação', ('Ladino · Ataque', 'Rogue · Strike'),
  ('Cause 1 de dano. Se o alvo estiver Desprevenido ou não estiver bloqueando, cause +2.',
   'Deal 1 damage. If the target is Off-guard or not blocking, deal +2.'),
  ('Onde a armadura acaba, ela começa.', 'Where the armor ends, she begins.'), ['damage_1', 'sneak'], tags=['action'])
c('purple', 'common', ('Finta', 'Feint'), 'Ação', ('Ladino · Truque', 'Rogue · Trick'),
  ('Uma criatura fica Desprevenida (−1 DEF neste turno). Compre 1 carta.',
   'A creature becomes Off-guard (−1 DEF this turn). Draw 1 card.'),
  ('Olhe para a esquerda. Não, a outra esquerda.', 'Look left. No, the other left.'), ['off_guard', 'draw_1'], tags=['action'])
c('purple', 'common', ('Esquiva Ágil', 'Nimble Dodge'), 'Ação', ('Ladino · Reação', 'Rogue · Reaction'),
  ('Reação: uma criatura sua ganha +2 DEF contra este ataque. Se não sofrer dano, ganha Furtividade até o fim do seu próximo turno.',
   'Reaction: a creature of yours gains +2 DEF against this attack. If it takes no damage, it gains Stealth until the end of your next turn.'),
  ('Estava ali. Juro que estava.', 'She was right there. I swear.'), ['arcane_armor', 'reaction', 'stealth'], tags=['action'])
c('purple', 'common', ('Torcer a Lâmina', 'Twist the Knife'), 'Ação', ('Ladino · Ataque', 'Rogue · Strike'),
  ('Uma criatura que sofreu dano neste turno sofre 1 de dano persistente. Compre 1 carta.',
   'A creature that took damage this turn takes 1 persistent damage. Draw 1 card.'),
  ('O corte fecha. A dor, não.', 'The cut closes. The pain doesn’t.'), ['burn', 'draw_1'], tags=['action'])
c('purple', 'uncommon', ('Batedora de Carteiras', 'Pickpocket'), 'Criatura', ('Halfling · Ladina', 'Halfling · Rogue'),
  ('Furtividade. Quando causar dano ao oponente, roube 1 {gold} dele.',
   'Stealth. When she deals damage to the opponent, steal 1 {gold} from them.'),
  ('Ela sorri, pede licença e leva a bolsa junto.', 'She smiles, excuses herself, and takes the purse along.'), ['stealth', 'steal'], (1, 1), ['creature'])
c('purple', 'uncommon', ('Lâmina Envenenada', 'Poisoned Blade'), 'Encantamento', ('Assassino · Veneno', 'Assassin · Poison'),
  ('Suas criaturas têm +1 ATK. Quem elas ferirem fica Envenenado: 1 de dano no início de cada turno dele, por 3 turnos.',
   'Your creatures have +1 ATK. Whoever they wound is Poisoned: 1 damage at the start of each of its turns, for 3 turns.'),
  ('Um arranhão. Amanhã, um funeral.', 'A scratch. Tomorrow, a funeral.'), ['poison', 'weapon_mastery'], tags=['enchantment'])
c('purple', 'uncommon', ('Marca da Morte', 'Mark for Death'), 'Habilidade', ('Assassino', 'Assassin'),
  ('Marque uma criatura inimiga: seus ataques contra ela causam +1. Quando ela morrer, ganhe 2 {shadow}.',
   'Mark an enemy creature: your attacks against it deal +1. When it dies, gain 2 {shadow}.'),
  ('O contrato já foi pago. Falta só entregar.', 'The contract’s been paid. It only needs delivering.'), ['hunt_prey', 'gain_resource_2'], tags=['ability'])
c('purple', 'rare', ('Golpe Letal', 'Assassinate'), 'Ação', ('Assassino · Ataque', 'Assassin · Strike'),
  ('Destrua uma criatura que esteja Desprevenida ou que não esteja bloqueando. Compre 1 carta.',
   'Destroy a creature that is Off-guard or not blocking. Draw 1 card.'),
  ('Ele nunca viu a lâmina. Ninguém vê.', 'He never saw the blade. No one does.'), ['destroy_minor', 'draw_1'], tags=['action'])
c('purple', 'unique', ('Vesper, a Sombra Sem Nome', 'Vesper, the Nameless Shadow'), 'Criatura', ('Lendária · Assassina', 'Legendary · Assassin'),
  ('Furtividade. Iniciativa. Toque mortal. Contra alvos Desprevenidos ou que não estão bloqueando, Vesper causa +2 de dano.',
   'Stealth. First strike. Deathtouch. Against Off-guard or non-blocking targets, Vesper deals +2 damage.'),
  ('Os contratos dela não têm assinatura. Só datas.', 'Her contracts have no signature. Only dates.'),
  ['stealth', 'first_strike', 'deathtouch', 'sneak'], (3, 2), ['creature', 'legendary'])

# ═══════════ BEGE — Clérigo / Paladino ═══════════
c('white', 'common', ('Cura', 'Heal'), 'Magia', ('Clérigo · Fonte Divina', 'Cleric · Divine Font'),
  ('Escolha um: você ou uma criatura sua recupera 4 PV; ou cause 2 de dano a um morto-vivo.',
   'Choose one: you or a creature of yours regains 4 HP; or deal 2 damage to an undead.'),
  ('A mesma luz que fecha feridas queima o que não devia andar.', 'The light that closes wounds burns what shouldn’t walk.'), ['heal_4', 'modal'], tags=['spell'])
c('white', 'common', ('Bênção', 'Bless'), 'Magia', ('Clérigo', 'Cleric'),
  ('Suas criaturas ganham +1/+1 e Vigilância até o fim do turno.', 'Your creatures get +1/+1 and Vigilance until end of turn.'),
  ('Cada escudo ergue um pouco mais alto.', 'Every shield rises a little higher.'), ['bless', 'inspire', 'vigilance'], tags=['spell'])
c('white', 'common', ('Golpe Restaurador', 'Restorative Strike'), 'Ação', ('Clérigo · Ataque', 'Cleric · Strike'),
  ('Cause 2 de dano a uma criatura e recupere 2 PV.', 'Deal 2 damage to a creature and regain 2 HP.'),
  ('A maça desce. A graça sobe.', 'The mace falls. Grace rises.'), ['damage_2', 'heal_2'], tags=['action'])
c('white', 'common', ('Fonte Divina', 'Divine Font'), 'Encantamento', ('Clérigo', 'Cleric'),
  ('No início do seu turno, se você tiver 2 {faith} ou menos, ganhe 1 {faith}.',
   'At the start of your turn, if you have 2 {faith} or fewer, gain 1 {faith}.'),
  ('A oração da manhã enche o cálice.', 'Morning prayer fills the chalice.'), ['gain_resource_1'], tags=['enchantment'])
c('white', 'uncommon', ('Golpe Retributivo', 'Retributive Strike'), 'Ação', ('Paladino · Reação', 'Champion · Reaction'),
  ('Reação: quando um inimigo atacar uma criatura sua, previna 2 desse dano e cause 2 de dano ao atacante.',
   'Reaction: when an enemy attacks a creature of yours, prevent 2 of that damage and deal 2 damage to the attacker.'),
  ('Tocar num protegido é responder ao protetor.', 'Harm the ward, answer to the guardian.'), ['shield_block', 'damage_2', 'reaction'], tags=['action'])
c('white', 'uncommon', ('Paladino Juramentado', 'Oathsworn Champion'), 'Criatura', ('Humano · Paladino', 'Human · Champion'),
  ('Vigilância. Provocar.', 'Vigilance. Taunt.'),
  ('O juramento pesa mais que a armadura. E protege mais.', 'The oath weighs more than the armor. And guards better.'), ['vigilance', 'taunt'], (2, 3), ['creature'])
c('white', 'uncommon', ('Aura de Coragem', 'Aura of Courage'), 'Encantamento', ('Paladino · Aura', 'Champion · Aura'),
  ('Suas criaturas não ficam Amedrontadas, e todo dano a elas é reduzido em 1.',
   'Your creatures can’t be Frightened, and all damage to them is reduced by 1.'),
  ('Ao lado dele, até o medo recua.', 'Beside him, even fear steps back.'), ['aura_protection'], tags=['enchantment'])
c('white', 'rare', ('Ressurreição', 'Raise Dead'), 'Magia', ('Clérigo', 'Cleric'),
  ('Traga de volta ao jogo uma criatura do seu cemitério. Ela volta com +1/+1.',
   'Return a creature from your graveyard to play. It returns with +1/+1.'),
  ('Ainda não. Não hoje.', 'Not yet. Not today.'), ['resurrect', 'pump_1'], tags=['spell'])
c('white', 'unique', ('Aldric, Martelo da Aurora', 'Aldric, Dawnhammer'), 'Criatura', ('Lendário · Humano · Paladino', 'Legendary · Human · Champion'),
  ('Vigilância. Vampirismo. Castigo: contra mortos-vivos e demônios, causa +2 de dano. Todo dano às suas outras criaturas é reduzido em 1.',
   'Vigilance. Lifelink. Smite: against undead and fiends, deals +2 damage. All damage to your other creatures is reduced by 1.'),
  ('Onde o martelo cai, amanhece.', 'Where the hammer falls, dawn breaks.'), ['vigilance', 'lifelink', 'smite', 'aura_protection'], (3, 4), ['creature', 'legendary'])

# ═══════════ PRATA — Monge / Bardo ═══════════
c('silver', 'common', ('Rajada de Golpes', 'Flurry of Blows'), 'Ação', ('Monge · Ataque', 'Monk · Strike'),
  ('Cause 1 de dano duas vezes (alvos iguais ou diferentes).', 'Deal 1 damage twice (same or different targets).'),
  ('Ele contou dois golpes. Foram cinco.', 'He counted two blows. There were five.'), ['damage_2', 'flurry'], tags=['action'])
c('silver', 'common', ('Postura da Montanha', 'Mountain Stance'), 'Habilidade', ('Monge · Postura', 'Monk · Stance'),
  ('Postura. Enquanto nela, você tem Resistência 1 e não pode ficar Caído. Só uma Postura por vez.',
   'Stance. While in it, you have Resistance 1 and can’t be knocked Prone. Only one Stance at a time.'),
  ('A montanha não luta. A montanha fica.', 'The mountain doesn’t fight. The mountain remains.'), ['resistance', 'ki_stance'], tags=['ability'])
c('silver', 'common', ('Hino de Cura', 'Hymn of Healing'), 'Magia', ('Bardo · Composição', 'Bard · Composition'),
  ('Composição. Você recupera 2 PV agora e mais 2 no início do seu próximo turno.',
   'Composition. You regain 2 HP now and 2 more at the start of your next turn.'),
  ('A melodia costura o que a espada rasgou.', 'The melody stitches what the sword tore.'), ['heal_4'], tags=['spell'])
c('silver', 'common', ('Contra-Atuação', 'Counter Performance'), 'Magia', ('Bardo · Composição · Reação', 'Bard · Composition · Reaction'),
  ('Reação: previna até 3 de dano de uma magia ou efeito que atinja você ou suas criaturas.',
   'Reaction: prevent up to 3 damage from a spell or effect hitting you or your creatures.'),
  ('Uma nota mais alta que o feitiço.', 'One note louder than the spell.'), ['shield_block', 'reaction'], tags=['spell'])
c('silver', 'uncommon', ('Golpe de Ki', 'Ki Strike'), 'Ação', ('Monge · Ki', 'Monk · Ki'),
  ('Cause 2 de dano. Este dano ignora Resistência e conta como mágico.',
   'Deal 2 damage. This damage ignores Resistance and counts as magical.'),
  ('O punho para. A energia, não.', 'The fist stops. The energy doesn’t.'), ['damage_2', 'ki_strike'], tags=['action'])
c('silver', 'uncommon', ('Punho Atordoante', 'Stunning Fist'), 'Ação', ('Monge · Ataque', 'Monk · Strike'),
  ('Cause 1 de dano. O alvo fica Atordoado: perde o próximo turno inteiro.',
   'Deal 1 damage. The target is Stunned: it loses its entire next turn.'),
  ('Um toque no ponto certo e o mundo apaga.', 'One touch in the right spot and the world goes dark.'), ['damage_1', 'stun'], tags=['action'])
c('silver', 'uncommon', ('Antífona da Coragem', 'Courageous Anthem'), 'Magia', ('Bardo · Composição · Truque', 'Bard · Composition · Cantrip'),
  ('Suas criaturas ganham +1 ATK até o fim do turno. Truque: no fim do turno, pague 1 {focus} para devolver esta carta à mão.',
   'Your creatures get +1 ATK until end of turn. Cantrip: at end of turn, pay 1 {focus} to return this card to your hand.'),
  ('O refrão que todo exército sabe de cor.', 'The chorus every army knows by heart.'), ['inspire', 'cantrip'], tags=['spell'])
c('silver', 'rare', ('Lamento Funesto', 'Dirge of Doom'), 'Magia', ('Bardo · Composição', 'Bard · Composition'),
  ('Todas as criaturas inimigas ficam Amedrontadas (−1 ATK até o fim do próximo turno delas). O oponente descarta 1 carta.',
   'All enemy creatures become Frightened (−1 ATK until the end of their next turn). The opponent discards 1 card.'),
  ('Uma canção de ninar para quem não vai acordar.', 'A lullaby for those who won’t wake.'), ['frighten', 'aoe_damage', 'discard'], tags=['spell'])
c('silver', 'unique', ('Mestre Sen, Punho Sereno', 'Master Sen, the Serene Fist'), 'Criatura', ('Lendário · Humano · Monge', 'Legendary · Human · Monk'),
  ('Iniciativa. Resistência 1. Rajada: Mestre Sen ataca duas vezes por turno. O dano dele ignora Resistência.',
   'First strike. Resistance 1. Flurry: Master Sen attacks twice per turn. His damage ignores Resistance.'),
  ('Ele não bate primeiro. Bate antes.', 'He doesn’t strike first. He strikes before.'), ['first_strike', 'resistance', 'flurry', 'ki_strike'], (3, 3), ['creature', 'legendary'])

# ═══════════ RECURSOS ═══════════
c('resources', 'common', ('Bolsa de Moedas', 'Coin Pouch'), 'Recurso', ('Ouro', 'Gold'),
  ('Ganhe 1 {gold}.', 'Gain 1 {gold}.'), ('Tilinta como promessa.', 'It jingles like a promise.'), ['gold_value_1'], tags=['resource'])
c('resources', 'common', ('Baú do Tesouro', 'Treasure Chest'), 'Recurso', ('Ouro', 'Gold'),
  ('Ganhe 3 {gold}.', 'Gain 3 {gold}.'), ('O que o dragão não levou, você leva.', 'What the dragon didn’t take, you do.'), ['gold_value_3'], tags=['resource'])
c('resources', 'common', ('Poção de Cura', 'Healing Potion'), 'Recurso', ('Consumível · Poção', 'Consumable · Potion'),
  ('Recupere 4 PV.', 'Regain 4 HP.'), ('Gosto de cereja e remorso.', 'Tastes of cherry and regret.'), ['heal_4'], tags=['resource'])
c('resources', 'common', ('Fogo de Alquimista', 'Alchemist’s Fire'), 'Recurso', ('Consumível · Bomba', 'Consumable · Bomb'),
  ('Cause 2 de dano a uma criatura. Ela sofre 1 de dano persistente.', 'Deal 2 damage to a creature. It takes 1 persistent damage.'),
  ('Não agite. Sério.', 'Do not shake. Seriously.'), ['damage_2', 'burn'], tags=['resource'])
c('resources', 'uncommon', ('Pergaminho de Magia', 'Spell Scroll'), 'Recurso', ('Consumível · Pergaminho', 'Consumable · Scroll'),
  ('Procure uma Magia no seu deck e ponha na mão.', 'Search your deck for a Spell and put it into your hand.'),
  ('Uma magia inteira, dobrada em quatro.', 'A whole spell, folded in four.'), ['search'], tags=['resource'])
c('resources', 'uncommon', ('Espada de Aluguel', 'Hired Sellsword'), 'Mercenário', ('Humano · Mercenário', 'Human · Mercenary'),
  ('Contratar: pague o custo em {gold}. Luta por quem pagar mais.', 'Hire: pay the cost in {gold}. Fights for whoever pays more.'),
  ('Lealdade? Isso custa extra.', 'Loyalty? That costs extra.'), ['hire_gold'], (2, 2), ['mercenary', 'creature'])
c('resources', 'uncommon', ('Mapa do Tesouro', 'Treasure Map'), 'Recurso', ('Mapa', 'Map'),
  ('Preveja 2. Compre 1 carta. Ganhe 1 {gold}.', 'Scry 2. Draw 1 card. Gain 1 {gold}.'),
  ('O X nunca é onde parece.', 'X never marks where it seems.'), ['scry_2', 'draw_1', 'gold_value_1'], tags=['resource'])
c('resources', 'rare', ('Varinha de Relâmpago', 'Wand of Lightning'), 'Recurso', ('Varinha', 'Wand'),
  ('Cause 3 de dano. Truque: no fim do turno, pague 1 {gold} para devolver esta carta à mão.',
   'Deal 3 damage. Cantrip: at end of turn, pay 1 {gold} to return this card to your hand.'),
  ('Cabe no bolso. O trovão não.', 'It fits in a pocket. The thunder doesn’t.'), ['damage_3', 'cantrip'], tags=['resource'])
c('resources', 'unique', ('Elixir da Vida', 'Elixir of Life'), 'Recurso', ('Consumível · Elixir', 'Consumable · Elixir'),
  ('Recupere 4 PV e compre 2 cartas. Remova todas as condições das suas criaturas.',
   'Regain 4 HP and draw 2 cards. Remove all conditions from your creatures.'),
  ('Dizem que o alquimista que o fez ainda está vivo.', 'They say the alchemist who made it is still alive.'), ['heal_4', 'draw_2'], tags=['resource'])

# ═══════════ EQUIPAMENTOS (ATK/DEF = bônus na ficha) ═══════════
c('equipment', 'common', ('Espada Longa', 'Longsword'), 'Equipamento', ('Mão principal', 'Main hand'),
  ('Arma. Enquanto equipada, +2 ATK.', 'Weapon. While equipped, +2 ATK.'),
  ('Simples, honesta, afiada.', 'Simple, honest, sharp.'), ['equip_slot_weapon'], (2, 0), ['equipment', 'weapon'])
c('equipment', 'common', ('Escudo de Aço', 'Steel Shield'), 'Equipamento', ('Mão secundária', 'Off hand'),
  ('+1 DEF. Uma vez por turno, previna até 3 de dano de uma fonte (Bloqueio com escudo).',
   '+1 DEF. Once per turn, prevent up to 3 damage from one source (Shield Block).'),
  ('Cada amassado é uma história que você viveu para contar.', 'Every dent is a story you lived to tell.'), ['equip_slot_weapon', 'shield_block'], (0, 1), ['equipment', 'offhand'])
c('equipment', 'common', ('Cota de Malha', 'Chain Mail'), 'Equipamento', ('Peito · Armadura', 'Chest · Armor'),
  ('+3 DEF. Penalidade: −1 em Destreza enquanto equipada.', '+3 DEF. Penalty: −1 Dexterity while equipped.'),
  ('Pesa. Mas pesa menos que um caixão.', 'It’s heavy. But lighter than a coffin.'), ['equip_slot_armor', 'equip_penalty'], (0, 3), ['equipment', 'chest'])
c('equipment', 'common', ('Arco Longo', 'Longbow'), 'Equipamento', ('Mão principal · Duas mãos', 'Main hand · Two-handed'),
  ('Arma. +1 ATK. Alcance: você pode atacar e bloquear criaturas com Voo.',
   'Weapon. +1 ATK. Reach: you can attack and block creatures with Flying.'),
  ('Teixo, corda e paciência.', 'Yew, string and patience.'), ['equip_slot_weapon', 'reach'], (1, 0), ['equipment', 'weapon'])
c('equipment', 'uncommon', ('Botas Élficas', 'Elven Boots'), 'Equipamento', ('Pés', 'Feet'),
  ('+1 em Destreza. Seu primeiro ataque em cada turno tem Furtividade.', '+1 Dexterity. Your first attack each turn has Stealth.'),
  ('Nem a neve lembra por onde você passou.', 'Not even the snow remembers where you walked.'), ['equip_slot_accessory', 'permanent_buff_1', 'stealth'], tags=['equipment', 'feet'])
c('equipment', 'uncommon', ('Amuleto Protetor', 'Warding Amulet'), 'Equipamento', ('Amuleto', 'Amulet'),
  ('+1 em Sabedoria. Todo dano que você sofre é reduzido em 1.', '+1 Wisdom. All damage you take is reduced by 1.'),
  ('A avó jurou que funcionava. Funcionava.', 'Grandma swore it worked. It did.'), ['equip_slot_accessory', 'permanent_buff_1', 'equip_mitigate'], tags=['equipment', 'amulet'])
c('equipment', 'uncommon', ('Runa Flamejante', 'Flaming Rune'), 'Equipamento', ('Runa de arma', 'Weapon rune'),
  ('Grave numa arma: +1 ATK, e quem ela ferir sofre 1 de dano persistente. Perfurante.',
   'Etch it onto a weapon: +1 ATK, and whoever it wounds takes 1 persistent damage. Piercing.'),
  ('A lâmina lembra do forno em que nasceu.', 'The blade remembers the forge it was born in.'), ['equip_slot_weapon', 'burn', 'pierce'], (1, 0), ['equipment', 'weapon'])
c('equipment', 'rare', ('Vingadora Sagrada', 'Holy Avenger'), 'Equipamento', ('Mão principal', 'Main hand'),
  ('Arma. +2 ATK. Castigo: +2 de dano contra mortos-vivos e demônios. Você tem Resistência 1 contra magias.',
   'Weapon. +2 ATK. Smite: +2 damage against undead and fiends. You have Resistance 1 against spells.'),
  ('Forjada em oração, temperada em luz.', 'Forged in prayer, tempered in light.'), ['equip_slot_weapon', 'smite', 'resistance'], (2, 0), ['equipment', 'weapon'])
c('equipment', 'unique', ('Manto do Arquimago', 'Robe of the Archmagi'), 'Equipamento', ('Peito · Lendário', 'Chest · Legendary'),
  ('+2 em Inteligência, +1 DEF. Ao equipar, compre 2 cartas. Uma vez por turno, você pode anular uma magia inimiga (Contramágica).',
   '+2 Intelligence, +1 DEF. When equipped, draw 2 cards. Once per turn, you may counter an enemy spell (Counterspell).'),
  ('Os bordados mudam de lugar quando ninguém olha.', 'The embroidery moves when no one is looking.'), ['equip_slot_armor', 'permanent_buff_2', 'draw_2', 'counterspell'], (0, 1), ['equipment', 'chest'])

# ─── saída + relatório de equilíbrio ───
n = collections.Counter()
out = []
for x in cards:
    n[x['deck']] += 1
    s = x.pop('stats')
    out.append({**{k: v for k, v in x.items() if k not in ('score', 'suggested')}, 'n': n[x['deck']],
                'stats': {'atk': s['atk'], 'def': s['def_']} if s else None})
json.dump(out, open(os.path.join(ROOT, 'src/data/pf-cards.json'), 'w'), ensure_ascii=False, indent=1)

print(f'{"deck":10} cartas  pontos  custo  pontos/custo  curva')
for d in DECKS:
    xs = [x for x in cards if x['deck'] == d]
    pts = sum(x['score'] for x in xs); cst = sum(x['cost']['amount'] for x in xs)
    rar = collections.Counter(x['rarity'] for x in xs)
    print(f'{d:10} {len(xs):6} {pts:7} {cst:6} {pts / max(1, cst):12.2f}  {sorted(x["cost"]["amount"] for x in xs)}  {dict(rar)}')

# valor acima da curva (pontos − o que o custo "paga": 1 + 2 × custo), por deck
print('\nvalor acima da curva (média por carta):')
for d in DECKS:
    xs = [x for x in cards if x['deck'] == d]
    ex = [x['score'] - (1 + 2 * x['cost']['amount']) for x in xs]
    print(f'  {d:10} {sum(ex) / len(ex):5.2f}   ' + ' '.join(f"{x['text']['pt-BR']['name'][:14]}:{x['score']}/{x['cost']['amount']}" for x in xs))
