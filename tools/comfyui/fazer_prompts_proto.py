"""Prompts das artes da coleção Protótipo (uma cena por carta, na ordem das cartas de cada deck). Gera prompts.json."""
import json
B = "a fierce red-braided barbarian woman in a horned iron helmet and chain mail armor with a huge double-bladed greataxe"
K = "a young battle mage man with short dark hair in deep blue and silver robes, glowing cyan arcane runes on his gauntlets"
L = "an elven ranger woman with a green hood, leather armor and an elegant longbow"
M = "a pale hexblade warlock woman in a black hooded cloak with glowing violet eyes and a black katana"
POTION = "a glowing red healing potion in an ornate round glass flask with a cork and a wax seal, sparkles and soft red light, standing on a wooden alchemist table with herbs, a mortar, scrolls and candles, shelves of colorful jars behind"
DECKS = {
 'red': [
  f"{B}, mid-swing, bringing the greataxe down in a brutal overhead strike, a burst of orange sparks and flying shield splinters, snowy mountain fortress at dusk",
  f"{B} slashing sideways with the greataxe, a long crimson arc of blood droplets trailing the blade, burning village at night",
  f"{B} charging forward at full sprint, shoulder first, dust cloud and red speed streaks behind her, battlefield with banners",
  f"{B} screaming in berserker rage, a blazing aura of red and orange flames erupting around her body, glowing red eyes, embers rising, dark stormy sky",
  f"{B} delivering a powerful front kick, her boot in the foreground, a skeleton warrior shattering into flying bones, torch-lit dungeon corridor",
  f"{B} standing on a hill after battle, catching her breath, a cloud of warm breath in the cold air, golden sunrise behind her, torn banners",
  f"{B} rising from one knee, wounded but determined, a warm golden-red healing glow surrounding her, campfire in a forest clearing at night",
  f"{B} braced behind a huge round iron shield, arrows bouncing off it with sparks, grey castle wall and rain",
  f"{B} raising her greataxe to the sky and shouting a war cry, red shockwave rings spreading from her, mountain pass, warriors' silhouettes behind",
  f"{B} spinning with the greataxe in a wide horizontal arc, a red crescent slash trail circling her, goblin silhouettes flying back, muddy battlefield",
  f"{B} smashing a knight's tower shield apart with the haft of her axe, the shield cracking in two, splinters flying, castle courtyard",
  f"{B} hurling a spinning hand axe toward the viewer, the axe in mid-air with a red motion trail, pine forest",
  f"{B} leaping high in the air with the greataxe raised overhead, about to smash the ground, the earth below cracking with a red-orange shockwave",
  f"{B} with glowing red eyes, crimson blood mist swirling around her and into her body, dark red sky, eerie and violent mood",
  f"{B} attacking in a furious flurry, two overlapping red afterimages of her axe slashes, sparks and debris, cave arena",
  f"{B} surrounded by giant ghostly red spirits of ancient horned warrior ancestors rising behind her, glowing runes, mountain shrine with standing stones",
  POTION,
 ],
 'blue': [
  f"{K} snapping his fingers, a tiny crackling blue-white spark shooting from his hand, wizard library with tall bookshelves",
  f"{K} firing three glowing cyan magic missiles from his open palm, curving trails of light, arcane tower balcony at night",
  f"{K} casting a pale blue ray of frost from his staff, ice crystals forming along the beam, frozen lake and snowy pines",
  f"{K} raising a translucent hexagonal cyan magic shield in front of him, a fireball exploding against it, glowing glyphs, stone ruins",
  f"{K} meditating cross-legged, floating above the floor, glowing blue runes orbiting around him, a beam of starlight, observatory dome",
  f"{K} wielding a sword made of pure cyan arcane energy, slashing diagonally, glowing rune trail, ancient vault",
  "a towering wall of glowing blue arcane runes and hard light rising from cracked ground, blocking a dark corridor, small goblin silhouettes bouncing off it, ruined courtyard",
  f"{K} reading a huge glowing spellbook by candlelight, books and pages floating around him, cozy wizard tower study",
  "a massive stone elemental golem made of mossy boulders with glowing blue crystal veins and glowing eyes, fists raised, rocky canyon",
  f"{K} in a martial combat stance, one fist wrapped in blue arcane flame, the other hand holding a glowing staff, a runic circle shining under his feet, arena",
  f"{K} hurling a long spear of white-hot fire, the lance of flame streaking forward, fiery explosion in the distance, volcanic cave",
  f"{K} unleashing a huge roaring fireball from both hands, orange and yellow flames lighting the night battlefield",
  f"{K} casting forked blue chain lightning that jumps between several skeleton warriors, stormy sky, ruined castle",
  "a towering fire elemental made of swirling flames and magma with glowing white eyes, rising from a burning rune circle, dark temple",
  "a giant flaming meteor falling from the night sky toward a valley, long fiery trail, a small robed mage silhouette with raised arms on a cliff in the foreground",
  "a glowing blue mana potion in a tall crystal bottle with a silver stopper, swirling stars inside, blue light, on a wizard desk with crystals, quills and scrolls",
  POTION,
 ],
 'green': [
  f"{L} drawing and loosing an arrow in one fast motion, the arrow just leaving the bow with a streak of wind, autumn forest",
  f"{L} aiming carefully with one eye closed, a glowing green arrow nocked on the bow, a beam of light marking the line of the shot, misty ancient forest",
  f"{L} shooting an arrow dripping with glowing green poison, poison droplets trailing behind the arrowhead, dark swamp with mist",
  f"{L} crouching and pointing forward, a glowing green hunter's mark sigil floating in the air over a distant beast silhouette, forest edge at twilight",
  "a fierce grey wolf with glowing green eyes leaping forward with bared fangs, leaves swirling around it, green spirit energy trailing from its fur, misty forest",
  f"{L} as her skin turns into brown tree bark armor with glowing green leaves, a sword shattering against her raised arm, sacred grove",
  "thorny green vines bursting from the ground and wrapping tightly around an armored orc warrior, pulling him down, forest clearing, green magic glow",
  f"{L} hidden among dense ferns and leaves, only her eyes and the tip of her drawn bow visible, dappled light, deep forest",
  f"{L} firing two arrows at once from her bow, both arrows flying side by side with twin wind trails, sunset forest",
  "glowing golden-green healing sap dripping from an ancient tree into cupped hands, soft healing light, fireflies, sacred forest",
  f"{L} with glowing green eyes crouched beside a wolf and a hawk, a green aura of primal energy flowing between the three, wild meadow at dawn",
  "dozens of arrows raining down from a dramatic cloudy sky onto a valley, an elven archer silhouette on a cliff in the foreground shooting upward",
  "a huge brown grizzly bear with moss on its back standing on its hind legs and roaring, claws raised, ancient forest with giant trees",
  "a pack of grey wolves emerging from a moonlit forest and howling, glowing eyes, full moon, fog between the trees",
  "a swirling tornado of thorns, leaves and green energy tearing through a forest clearing, goblin silhouettes thrown into the air, stormy sky",
  POTION,
 ],
 'black': [
  f"{M}, mid-swing, slashing the katana diagonally, a huge crescent trail of violet shadow energy and dripping green poison following the blade, the dark silhouette of a falling orc at the edge of the frame, ruined temple under a giant purple moon",
  f"{M} lunging forward in a fast thrust, the katana extended straight ahead, purple speed lines, dark alley at night",
  f"{M} casting a curse with an outstretched hand, a large glowing purple skull sigil with a crosshair mark floating in the air, dark green and purple smoke",
  f"{M} with one hand raised, pulling streams of red and purple life energy toward her palm from outside the frame, her eyes glowing red, crypt with candles",
  "a skeleton warrior with a rusty sword and a round shield clawing its way out of a grave, green ghostly light, graveyard at night with crooked tombstones",
  f"{M} holding her bleeding palm over a glowing purple pact circle with demonic runes, drops of blood falling into it, dark altar with candles",
  "giant purple spectral claws tearing out of a rift in a starry black void, slashing downward, sparks of violet energy",
  f"{M} dodging in a whirl of black shadows, several shadow afterimages of her fading behind, moonlit rooftops",
  f"{M} listening as a huge shadowy otherworldly patron with many glowing eyes looms behind her in the darkness, floating purple tomes",
  f"{M} holding her katana upright as it ignites with purple demonic fire and glowing runes along the blade, ruined cathedral",
  f"{M} in a low sword-drawing stance, hand on the sheathed katana, black shadow tendrils and violet smoke coiling around her, dark bamboo forest",
  f"{M} firing a dark purple bolt of shadow energy from her palm, black and violet sparks, gothic hall",
  "a muscular horned red-skinned demon with burning eyes, bound by glowing purple chains, rising from a fiery pentagram, hellish cave",
  "a sickly green and purple plague cloud with swarming flies spreading over a group of choking soldiers, dead trees, gloomy sky",
  "a legion of skeleton warriors with shields and spears marching out of thick fog, green eerie light, cemetery gates",
  f"{M} raising her katana as glowing ghostly teal souls spiral through the air into the blade, battlefield at night",
  POTION,
 ],
}
jobs = []
for i, (color, prompts) in enumerate(DECKS.items()):
    for n, p in enumerate(prompts, 1):
        jobs.append({"id": f"proto-{color}_{n:03d}", "seed": i * 100 + n, "prompt": p + "."})
json.dump(jobs, open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'prompts-proto.json'), 'w'), indent=1, ensure_ascii=False)
print(len(jobs))
