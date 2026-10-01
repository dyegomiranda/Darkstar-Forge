"""
Prompts das artes da coleção Protótipo (uma cena por carta, na ordem das cartas de cada deck).
Gera prompts-proto.json (para o gerar_proto.py) e src/data/art-prompts.json (botão "Gerar mais" do app).

Regras das cenas:
 - as cartas servem a qualquer herói, então os personagens são genéricos e variados (não os heróis prontos);
 - cartas de ataque mostram o golpe ACERTANDO um inimigo, com a arma bem visível;
 - uma ideia por cena, descrita de forma simples (o que o Flux erra menos).
"""
import json, os

POTION = "a glowing red healing potion in a round glass flask with a cork and a wax seal, soft red light and sparkles, on a wooden alchemist table with herbs, a mortar and candles, shelves of colorful jars behind"
DECKS = {
 'red': [
  "a muscular bearded barbarian man swings a huge greataxe down onto an orc's wooden shield, the shield splits in two with flying splinters and orange sparks, snowy mountain fortress at dusk",
  "a female gladiator slashes a goblin raider across the chest with a broad sword, a clear arc of red blood drops flies from the wound, burning village at night",
  "an armored dwarf warrior charges shoulder-first into a line of skeleton soldiers, the skeletons are knocked into the air, dust cloud, battlefield with torn banners",
  "a barbarian woman with war paint screams in rage, a blazing aura of red and orange flames surrounds her whole body, embers rising, stormy sky",
  "a warrior's heavy boot kicks a skeleton warrior in the chest, the skeleton flies backward and breaks apart into bones, torch-lit dungeon corridor",
  "a tired veteran soldier leans on his sword on a hilltop after a battle, his breath visible as mist in the cold air, golden sunrise, broken spears in the ground",
  "a wounded knight rises from one knee, a warm golden healing light glows around his body, his wounds closing, campfire in a forest clearing at night",
  "a shield-bearer crouches behind a huge round iron shield, enemy arrows bounce off the shield with sparks, rainy castle wall",
  "a war chief raises a battle axe and roars, red shockwave rings spread from his mouth, warriors cheer behind him, mountain pass",
  "a berserker spins with a two-handed axe, a wide red crescent slash hits three goblins at once and throws them back, muddy battlefield",
  "a warrior smashes a knight's tower shield with a war hammer, the shield cracks and the knight staggers backward, castle courtyard",
  "a spinning hand axe flies through the air and hits a fleeing bandit in the back, red motion trail behind the axe, pine forest",
  "a giant barbarian leaps and slams a huge hammer down on a troll, the ground cracks with an orange shockwave, the troll is crushed to its knees",
  "a berserker with glowing red eyes stands over fallen enemies, red blood mist rises from them and flows into his body, dark red sky",
  "a dual-wielding warrior hits an ogre with two axes in quick succession, two crossed red slash marks glow on the ogre's chest, cave arena",
  "an old chieftain surrounded by giant ghostly red spirits of horned ancestor warriors rising behind him, glowing runes, standing stones on a mountain",
  POTION,
  "a swordsman parries an enemy's sword with his own blade, a bright burst of sparks where the two blades meet, the enemy recoils, castle courtyard",
 ],
 'blue': [
  "a young apprentice wizard snaps his fingers and a small crackling blue spark zaps a giant rat, wizard library with tall bookshelves",
  "a wizard in blue robes casts three glowing cyan magic darts from his palm, the darts hit a stone gargoyle and it cracks, arcane tower balcony at night",
  "an ice mage shoots a pale blue ray of frost that freezes a charging wolf-man solid in ice, ice crystals in the air, frozen lake",
  "a sorceress holds up a translucent hexagonal cyan magic shield, an enemy fireball explodes harmlessly against the shield, stone ruins",
  "a robed scholar meditates floating above the floor, glowing blue runes orbit around him, a beam of starlight from above, observatory dome",
  "a battle mage slashes a stone golem with a sword made of pure cyan energy, a glowing cut appears across the golem's chest, ancient vault",
  "a towering wall of glowing blue runes and hard light rises from the ground, a group of goblins crash into it and bounce off, ruined courtyard",
  "an old wizard reads a huge glowing spellbook by candlelight, books and pages float in the air around him, cozy tower study",
  "a massive stone elemental made of mossy boulders with glowing blue crystal veins raises its fists, rocky canyon",
  "a battle mage in a fighting stance, one fist wrapped in blue arcane flame and a glowing staff in the other hand, a rune circle shines under his feet",
  "a fire mage throws a long lance of white-hot fire that pierces an armored minotaur through the chest, fiery explosion, volcanic cave",
  "a huge roaring fireball explodes among a group of orc soldiers and throws them into the air, a small robed mage in the foreground, night battlefield",
  "forked blue chain lightning jumps between three skeleton warriors and shatters them, a storm mage with raised hand, ruined castle in a thunderstorm",
  "a towering fire elemental made of swirling flames and magma with glowing white eyes rises from a burning rune circle, dark temple",
  "a giant flaming meteor crashes into an army in a valley with a huge explosion, a small robed mage with raised arms on a cliff in the foreground",
  "a glowing blue mana potion in a tall crystal bottle with a silver stopper, tiny stars swirling inside, blue light, on a wizard desk with crystals and scrolls",
  POTION,
  "a wizard raises his hand and an enemy's fire spell shatters in mid-air into harmless fragments of blue light, a glowing counter-rune in front of his palm",
 ],
 'green': [
  "a hooded archer shoots a quick arrow that hits a goblin in the shoulder, the goblin stumbles, autumn forest",
  "an elven sniper's glowing green arrow strikes a giant spider right in the eye, the spider rears back, misty ancient forest",
  "an archer's arrow dripping with green poison hits a troll in the arm, green poison veins spread across the troll's skin, dark swamp",
  "a hunter points at a fleeing deer-headed beast, a glowing green hunter's mark sigil floats above the beast, forest edge at twilight",
  "a fierce grey wolf with glowing green eyes leaps and bites a bandit's arm, leaves swirling, misty forest",
  "a druid's skin turns into tree bark armor with green leaves, an enemy's sword breaks against the druid's arm, sacred grove",
  "thorny green vines burst from the ground and wrap tightly around an armored orc warrior, pulling him down to his knees, forest clearing",
  "a camouflaged ranger hidden in dense ferns aims a bow at a patrol of bandits who walk past without noticing, deep forest",
  "an archer shoots two arrows at once, each arrow hits a different goblin, sunset forest",
  "a druid presses glowing golden-green tree sap onto a wounded soldier's arm, the wound closes in soft green light, ancient tree with fireflies",
  "a beastmaster with glowing green eyes runs beside a wolf and under a diving hawk, a green aura of primal energy connects the three, wild meadow at dawn",
  "dozens of arrows rain down from a cloudy sky onto a group of orc soldiers who raise their shields, archers on a cliff in the distance",
  "a huge brown grizzly bear with moss on its back stands on its hind legs and swipes a bandit with its claws, ancient forest with giant trees",
  "a pack of grey wolves bursts out of a moonlit forest and surrounds a frightened ogre, glowing eyes, full moon and fog",
  "a swirling tornado of thorns, leaves and green energy lifts several goblins into the air, a druid with raised staff in the foreground, stormy forest",
  POTION,
  "an agile scout leaps sideways and an enemy's sword slash misses by a hair, motion blur, flying leaves, forest path",
 ],
 'black': [
  "a hooded warlock swordsman slashes an armored orc with a black katana, a crescent of violet shadow energy and green poison follows the blade and cuts across the orc's chest, ruined temple under a purple moon",
  "a dark duelist lunges and stabs a bandit through the chest with a rapier, purple speed lines, the bandit's lantern falls, dark alley at night",
  "a witch points at a terrified knight, a glowing purple skull sigil with a crosshair appears over the knight's head, dark green and purple smoke",
  "a pale warlock grabs a kneeling soldier by the throat and drains red life energy from him, the red energy flows up the warlock's arm, crypt with candles",
  "a skeleton warrior with a rusty sword and a round shield claws its way out of a grave, green ghostly light, graveyard at night with crooked tombstones",
  "a cultist cuts his own palm with a dagger, drops of blood fall into a glowing purple pact circle with demonic runes, dark altar with candles",
  "giant purple spectral claws tear out of a rift in the air and slash a paladin's shield, starry black void behind the rift",
  "a rogue dodges in a whirl of black shadows, several shadow afterimages of him fade behind, an enemy's axe hits only smoke, moonlit rooftops",
  "a kneeling warlock listens as a huge shadowy otherworldly being with many glowing eyes leans down behind him, floating purple tomes",
  "a hexblade holds up a sword that ignites with purple demonic fire and glowing runes, then cuts down a knight whose shield melts, ruined cathedral",
  "a sword master in a low drawing stance with one hand on a sheathed katana, black shadow tendrils and violet smoke coil around the body, dark bamboo forest",
  "a warlock fires a dark purple bolt of shadow from his palm that hits a priest in the chest and throws him backward, gothic hall",
  "a muscular horned red demon with burning eyes, bound by glowing purple chains, rises from a fiery pentagram, hellish cave",
  "a sickly green and purple plague cloud with swarming flies covers a group of soldiers who cough and fall, dead trees, gloomy sky",
  "a legion of skeleton warriors with shields and spears marches out of thick fog, green eerie light, cemetery gates",
  "a necromancer raises a scythe and glowing teal ghostly souls are pulled out of several falling enemies and spiral into the blade, battlefield at night",
  POTION,
  "an attacker's sword hits a dark witch and a burst of purple shadow thorns lashes back from her body and wraps around the attacker's arm, ruined cathedral",
 ],
}
B = "a fierce red-braided barbarian woman in a horned iron helmet and chain mail"
K = "a young battle mage man with short dark hair in deep blue and silver robes"
L = "an elven ranger woman with a green hood and leather armor"
M = "a pale hexblade warlock woman in a black hooded cloak with glowing violet eyes"
HEROES = {'brunhild': (B, 'burning red sky'), 'kael': (K, 'arcane blue library'), 'lyra': (L, 'green forest'), 'morgana': (M, 'purple moonlit ruins')}

jobs = []
for i, (color, prompts) in enumerate(DECKS.items()):
    for n, p in enumerate(prompts, 1):
        jobs.append({"id": f"proto-{color}_{n:03d}", "seed": i * 100 + n, "prompt": p + "."})
for i, (hid, (desc, bg)) in enumerate(HEROES.items()):
    jobs.append({"id": f"heroi-{hid}", "seed": 900 + i, "prompt": f"character portrait, bust shot from the chest up, facing the viewer, {desc}, confident heroic expression, {bg} background, centered face."})

here = os.path.dirname(os.path.abspath(__file__))
json.dump(jobs, open(os.path.join(here, 'prompts-proto.json'), 'w'), indent=1, ensure_ascii=False)
# cópia para o app: o botão "Gerar mais" da janela de escolha das artes usa estes prompts
json.dump({j['id']: j['prompt'] for j in jobs if j['id'].startswith('proto-')}, open(os.path.join(here, '..', '..', 'src', 'data', 'art-prompts.json'), 'w'), ensure_ascii=False, indent=0)
print(len(jobs))
