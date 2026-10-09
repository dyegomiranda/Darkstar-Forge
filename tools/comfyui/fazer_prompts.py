"""Gera tools/comfyui/prompts-pf.json e docs/prompts-pf.md (rode: python3 tools/comfyui/fazer_prompts.py)."""
import json
import os

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

STYLE = ("fantasy trading card game illustration in the style of Magic: The Gathering card art, "
         "painterly digital oil painting, dramatic cinematic lighting, rich detailed textures, "
         "epic composition, highly detailed, masterpiece")
COMPOSITION = ("vertical portrait composition, main subject in the upper and middle part of the picture, "
               "calmer darker area at the bottom of the picture")
NEG = ("text, words, letters, caption, title, watermark, signature, logo, card frame, card border, user interface, "
       "playing card, blurry, lowres, jpeg artifacts, deformed, bad anatomy, bad hands, extra fingers, missing fingers, "
       "fused fingers, extra limbs, extra arms, extra legs, extra heads, duplicate, mutated, disfigured, cropped head, "
       "out of frame, photo, photorealistic, 3d render, cgi, anime, manga, cartoon, chibi, childish, nsfw, nudity")

PALETTE = {
 'red': "warm crimson, orange and ember color palette, fiery battlefield atmosphere",
 'blue': "deep blue, cyan and silver color palette, glowing arcane light",
 'green': "lush forest green and golden sunlight color palette, wild nature atmosphere",
 'black': "dark palette of black, bone white and sickly green and purple light, grim gothic atmosphere",
 'purple': "deep violet, indigo and moonlight color palette, shadowy night atmosphere",
 'white': "warm gold, ivory and white holy light color palette, radiant divine atmosphere",
 'silver': "silver, pale blue and misty grey color palette, calm serene atmosphere",
 'resources': "warm gold, amber and candlelight color palette",
 'equipment': "steel grey, leather brown and warm forge light color palette",
}

OBJECT_NEG = "people, person, human, face, character, crowd"

# (id, nome, cena, negativo extra)
C = [
# ── VERMELHO: Guerreiro / Bárbaro ──
("pf-red_001", "Double Slice", "a battle-scarred human woman fighter in dented steel plate armor in a dynamic dual-wielding fighting stance, a longsword in her right hand and a short sword in her left hand, each hand firmly gripping the hilt of its own sword, both blades pointing forward at an armored orc raider who staggers back with his shield knocked aside, two bright arcs of motion trailing the blades, muddy battlefield at dusk, sparks flying", "single sword, shield in her hands"),
("pf-red_002", "Vicious Swing", "a huge muscular bearded human fighter in heavy half-plate armor swinging an enormous two-handed greatsword in a wide overhead arc with his whole body weight, the blade crashing down onto a hobgoblin soldier's raised wooden shield which splinters apart, dust and debris exploding, low angle heroic view", ""),
("pf-red_003", "Sudden Charge", "a roaring half-orc barbarian with green-grey skin, tusks, a braided mohawk and a fur mantle sprinting forward at great speed, greataxe raised over his head, motion blur streaks and kicked-up dirt behind him, a line of frightened enemy spearmen ahead bracing for impact", ""),
("pf-red_004", "Rage", "close-up portrait of a human barbarian woman screaming in primal rage, glowing red veins on her neck and arms, eyes burning red, red war paint on her face, wild red hair, the whole scene tinted blood red, heat distortion and embers swirling around her, gripping a greataxe", ""),
("pf-red_005", "Raise a Shield", "a stoic bearded dwarf fighter in armor crouched behind a large round steel shield raised high, a volley of arrows and a blast of dragon fire slamming into the shield and splashing around its edges, two frightened human villagers sheltering behind him, sparks and flames", ""),
("pf-red_006", "Veteran Sentinel", "a grey-haired veteran human woman guard with a scarred face, wearing worn chainmail and a red tabard, standing alert at a fortified stone gate at night, halberd planted beside her, torchlight, a defeated goblin lying at her feet", "young, smiling"),
("pf-red_007", "Clan Berserker", "a massive tattooed human barbarian berserker wearing a wolf-pelt hood, charging straight toward the viewer through smoke and falling snow, two hand axes raised, mouth open in a war cry, smashing through a broken wooden barricade, clan warriors behind him", ""),
("pf-red_008", "Furious Finisher", "a barbarian leaping to deliver a final devastating blow, bringing a flaming greataxe down on a giant ogre, a shockwave of red fire and cracked earth radiating outward from the impact, red rage energy pouring out of the barbarian's body into the strike, dramatic climax moment", ""),
("pf-red_009", "Brunhild the Unbroken", "Brunhild, a single legendary towering human barbarian queen covered in many old scars, long blonde braided hair, horned iron helmet, bear-fur cloak, standing victorious on a hill of broken enemy shields and weapons, holding a huge notched greataxe, wounded but unbowed, stormy red sunset sky, heroic legendary pose", "multiple women, crowd"),
# ── AZUL: Mago / Feiticeiro ──
("pf-blue_001", "Force Darts", "a young elf wizard in blue robes extending one hand, three glowing bright blue darts of pure magical force streaking forward along curving trails and homing in on a fleeing goblin archer who tries to hide behind a stone pillar, ancient ruined library", ""),
("pf-blue_002", "Fireball", "a wizard seen from behind holding up a staff, a tiny bright bead of fire flying from the staff and blooming into a gigantic fireball explosion that engulfs a line of charging orc warriors, orange blast glowing against a deep blue night sky", ""),
("pf-blue_003", "Counterspell", "a composed human sorceress with black hair streaked with silver raising her open palm, a crackling hostile green lightning spell shattering into shards of blue glass against an invisible arcane ward in front of her, glowing blue runic circle, a shocked enemy warlock in the background", ""),
("pf-blue_004", "Grimoire Owl", "a wise great horned owl familiar with glowing blue eyes perched on top of a huge open spellbook on a cluttered wizard's desk, lit candles, floating blue arcane runes rising from the pages, a young apprentice studying in the soft background", ""),
("pf-blue_005", "Ray of Frost", "a young apprentice wizard girl firing a thin beam of icy blue-white frost from her fingertip, the ray freezing a charging giant rat inside a burst of ice crystals, frost spreading across the stone floor, cold mist", ""),
("pf-blue_006", "Arcane Shield", "an enemy sword striking a shimmering hexagonal blue arcane force shield that flickers into existence just in front of a startled wizard's face, the blade glancing off in a burst of blue sparks, dynamic close combat", ""),
("pf-blue_007", "Draconic Blood", "a young human sorceress with faint red and gold dragon scales emerging along her neck and arms, golden slit dragon eyes glowing, the ghostly translucent spectral shape of an ancient red dragon coiled behind her, a flame dancing in her palm, dark cavern", ""),
("pf-blue_008", "Blood Surge", "a pale human sorcerer cutting his own palm with a ritual dagger, his blood rising into the air and turning into a swirling torrent of crimson and blue arcane energy aimed at an enemy, veins glowing, pained but powerful expression", ""),
("pf-blue_009", "Seraphine, Archmage", "Seraphine, a single legendary middle-aged human archmage woman with long white hair and ornate deep blue and silver robes, floating above the top of a tall wizard tower, seven concentric glowing blue magic circles orbiting around her, two open spellbooks hovering beside her, starry night sky", "multiple women, crowd"),
# ── VERDE: Druida / Patrulheiro ──
("pf-green_001", "Hunt Prey", "a hooded half-elf ranger crouching in tall grass at the edge of a forest, touching fresh tracks on the ground, longbow in hand, staring at a distant owlbear in a misty clearing, a faint glowing green hunter's sigil floating over the owlbear, silent hunt", ""),
("pf-green_002", "Twin Shot", "an elf ranger woman shooting two arrows from her longbow in quick succession, the first arrow already flying through the air and the second arrow just released, both streaking toward a giant wasp flying over a forest river", "single arrow"),
("pf-green_003", "Wolf Companion", "a large grey timber wolf lunging and knocking a goblin warrior flat onto the ground, jaws clamped on his arm, a ranger with a drawn bow visible behind, autumn forest", ""),
("pf-green_004", "Entangling Flora", "thick thorny vines and gnarled roots erupting from the forest floor and wrapping around the legs of a group of armored bandits, pinning them in place, a druid in the background with glowing green hands", ""),
("pf-green_005", "Snare", "an orc raider stepping into a hidden rope snare trap on a forest path, the rope snapping tight around his ankle and yanking him upside down from a bent tree branch, surprised face, leaves flying", ""),
("pf-green_006", "Untamed Form", "a human druid in the middle of transforming into a great brown bear, half human and half bear, skin splitting into fur, face stretching into a roaring muzzle, torn robes, swirling green magical energy, forest clearing", ""),
("pf-green_007", "Leshy Warden", "a leshy, a small humanoid plant creature made of bark, moss and flowers with glowing amber eyes, standing guard with a thorn spear over the rusted helmet and sword of a fallen hero overgrown by plants, mushrooms and fireflies, deep enchanted forest", "human"),
("pf-green_008", "Tempest Surge", "a storm druid standing on a cliff calling down a massive bolt of lightning from swirling grey-green storm clouds onto a huge war troll, smaller lightning arcs striking goblins around it, heavy rain and wind", ""),
("pf-green_009", "Thessaly, Voice of the Grove", "Thessaly, a single legendary elf druid woman with long auburn hair adorned with blossoms and a crown of antlers, walking barefoot through a forest where flowers bloom and snow melts with each of her steps, a stag and a wolf walking beside her, golden spring sunlight", "multiple women, crowd"),
# ── PRETO: Necromante / Bruxo ──
("pf-black_001", "Vampiric Touch", "a gaunt necromancer grabbing a knight's face with a shadowy skeletal hand, drawing ghostly red life essence out of the knight into his own glowing body, the knight's skin turning grey, dark crypt, eerie green and purple light", ""),
("pf-black_002", "Raise Skeleton", "skeletons clawing their way up out of the muddy earth of a graveyard at night, a hooded necromancer raising a staff made of bone, sickly green light rising from the graves, one skeleton already standing with a rusted sword", ""),
("pf-black_003", "Ravenous Ghoul", "a hunched emaciated ghoul with long claws and grey rotting skin grabbing a terrified adventurer, frost-like paralysis spreading from its claws into his arm, drooling fangs, dark sewer tunnel", ""),
("pf-black_004", "Evil Eye", "an old witch with a crooked hat staring intensely, one eye glowing violet with a curse, a shimmering violet hex sigil hovering over a weakened warrior who is dropping his sword, candlelit hut with hanging dried herbs", ""),
("pf-black_005", "Soul Harvest", "wispy ghostly souls drifting up from a battlefield of fallen soldiers and being drawn into a black crystal lantern held up by a robed necromancer, blue-green spectral light", ""),
("pf-black_006", "Reanimate", "a necromancer at a stone altar sacrificing a shackled zombie to reanimate a fallen armored champion who rises from an open stone sarcophagus with glowing green eyes, dark energy flowing between them, ancient tomb", ""),
("pf-black_007", "Patron's Cat", "a sleek black cat familiar with glowing violet eyes sitting on the rim of a witch's cauldron, a small rolled message scroll tied to its collar, mysterious shadows, a vague otherworldly presence looming in the darkness behind it", ""),
("pf-black_008", "Patron's Final Word", "an enormous shadowy otherworldly patron entity with many glowing eyes, only its outline visible in the darkness, speaking a single word that makes a giant troll crumble into ash, a small witch standing before it, purple-black void", ""),
("pf-black_009", "Morwen, the Ashen Queen", "Morwen, a single legendary regal human necromancer queen with ash-grey skin, a black iron crown and a flowing gown made of smoke and ash, seated on a throne of bones in a ruined castle hall, rows of skeleton soldiers kneeling before her, pale green spectral fire", "multiple women"),
# ── ROXO: Ladino / Assassino ──
("pf-purple_001", "Sneak Attack", "a halfling rogue woman emerging from the shadows behind an armored guard and stabbing a dagger into the gap in his armor under the arm, moonlit alley, violet shadows", ""),
("pf-purple_002", "Feint", "a cocky human rogue duelist faking a rapier thrust to one side while his opponent, a burly swordsman, blocks the wrong side, the rogue smirking, rowdy tavern in the background", ""),
("pf-purple_003", "Nimble Dodge", "an acrobatic elf rogue woman twisting in a backflip in mid-air, an axe blade missing her by an inch, her body partly dissolving into shadowy smoke, rooftop at night under a violet moon", ""),
("pf-purple_004", "Twist the Knife", "close-up of a rogue's gloved hand twisting a curved dagger in the wounded side of an armored enemy, the enemy grimacing in pain, dim dungeon light, purple tones", ""),
("pf-purple_005", "Pickpocket", "a smiling halfling pickpocket girl bumping into a wealthy fat merchant in a crowded market, politely apologizing while her other hand lifts a heavy coin purse from his belt, coins glinting", ""),
("pf-purple_006", "Poisoned Blade", "a hooded assassin pouring dripping green poison from a small vial onto a thin blade, the poison sizzling on the steel, poison bottles and a skull on the table, dark hideout lit by a single candle", ""),
("pf-purple_007", "Mark for Death", "an assassin in a dark hood crouching on a gothic rooftop, looking down at a noble target in a torchlit courtyard below, a glowing violet target mark above the noble's head, a contract parchment with a wax seal in the assassin's hand", ""),
("pf-purple_008", "Assassinate", "a shadowy assassin standing behind an oblivious armored general inside a war tent, dagger drawn in a silent strike, the candle flame flickering, the general unaware", ""),
("pf-purple_009", "Vesper, the Nameless Shadow", "Vesper, a single legendary masked human assassin woman in layered black and deep violet leather armor, half of her body dissolving into living shadow, twin curved daggers, crouching on a gargoyle above a moonlit gothic city, huge violet moon, cloak billowing", "multiple women, crowd"),
# ── BEGE: Clérigo / Paladino ──
("pf-white_001", "Heal", "a kind human cleric woman laying a glowing hand on a wounded soldier's chest, warm golden divine light closing his wounds, while the same holy light in the background burns a shambling zombie that recoils in pain, battlefield chapel", ""),
("pf-white_002", "Bless", "a cleric raising a golden holy symbol high over a line of soldiers, a golden aura descending on all of them, their shields glowing, rays of light breaking through the clouds", ""),
("pf-white_003", "Restorative Strike", "a bearded dwarf cleric striking an undead skeleton with a glowing holy mace, the impact releasing golden light that flows back and heals a cut on the cleric's arm", ""),
("pf-white_004", "Divine Font", "a golden chalice on a temple altar overflowing with glowing liquid light at sunrise, a cleric kneeling in prayer before it, stained glass windows, morning sunbeams", ""),
("pf-white_005", "Retributive Strike", "a woman paladin stepping in front of a fallen ally, blocking an ogre's club with her shield while striking the ogre with a glowing longsword at the same moment, burst of golden light", ""),
("pf-white_006", "Oathsworn Champion", "a human paladin champion in shining full plate armor and a white tabard with a golden sun emblem, standing firm with a raised tower shield in front of a crowd of villagers, an oath scroll hanging from his belt, radiant light", ""),
("pf-white_007", "Aura of Courage", "a paladin with a glowing golden aura radiating around him, soldiers standing inside the aura without fear while dark shadowy fear-wraiths recoil at its edge, battlefield at night", ""),
("pf-white_008", "Raise Dead", "a fallen knight lying on a stone slab coming back to life, eyes opening, golden light pouring into him from a priestess's hands, feathers of light falling, cathedral interior", ""),
("pf-white_009", "Aldric, Dawnhammer", "Aldric, a single legendary battle-worn human paladin with a golden beard and ornate gold-trimmed plate armor, raising a glowing warhammer as the dawn sun breaks behind him, smiting a horned demon whose shadow burns away, rays of dawn light", "multiple men, crowd"),
# ── PRATA: Monge / Bardo ──
("pf-silver_001", "Flurry of Blows", "a human monk in simple grey robes unleashing a rapid flurry of punches, several motion-blurred afterimages of his fists, hitting a bandit five times, silver motion trails, temple courtyard", ""),
("pf-silver_002", "Mountain Stance", "an old dwarf monk standing in a deep martial arts stance on a mountain peak, completely unmoved while a gale of wind and a charging hill giant fail to push him, sea of clouds below, silver-grey light", ""),
("pf-silver_003", "Hymn of Healing", "a half-elf bard playing a lute, glowing silver musical notes flowing out like threads and stitching closed the wounds of injured companions around a campfire at night", ""),
("pf-silver_004", "Counter Performance", "a bard woman singing a powerful note, a visible silver wave of sound rippling outward and shattering an incoming fire spell into sparks before it reaches her allies", ""),
("pf-silver_005", "Ki Strike", "a monk woman striking with an open palm, a burst of glowing silver-white ki energy exploding through a stone golem, cracks spreading across the golem's body", ""),
("pf-silver_006", "Stunning Fist", "a monk touching a precise pressure point on a huge orc's neck with two fingers, the orc's eyes rolling back as he freezes, stunned, a ripple of energy spreading from the touch", ""),
("pf-silver_007", "Courageous Anthem", "a bard standing on a rock waving a banner and singing to a marching army, soldiers joining the chorus with raised weapons, silver light, inspiring atmosphere", ""),
("pf-silver_008", "Dirge of Doom", "a sinister bard in dark clothes playing a mournful violin, ghostly grey sound waves washing over frightened enemy soldiers who cower, fog and dead trees", ""),
("pf-silver_009", "Master Sen, the Serene Fist", "Master Sen, a single legendary serene elderly human monk with a long white beard and silver-grey robes, standing calmly in a mountain monastery courtyard while three attackers are already flying backwards from his strikes, falling cherry blossoms, silver mist", "young"),
# ── RECURSOS (objetos e personagens de apoio) ──
("pf-resources_001", "Coin Pouch", "a small worn leather coin pouch spilling gold coins onto a wooden tavern table, a few coins in mid-air, warm candlelight, still life", OBJECT_NEG),
("pf-resources_002", "Treasure Chest", "an open ancient treasure chest overflowing with gold coins, jewels and a golden crown inside a dragon's lair, the tail of a huge sleeping dragon visible in the background", OBJECT_NEG),
("pf-resources_003", "Healing Potion", "a round glass bottle of glowing red healing potion with a cork stopper on an alchemist's shelf, light shining through the red liquid, a few cherries beside it, still life", OBJECT_NEG),
("pf-resources_004", "Alchemist's Fire", "a clay flask of alchemist's fire shattering against a stone wall in a burst of sticky orange flames, dripping fire, two small goblins fleeing", ""),
("pf-resources_005", "Spell Scroll", "an unrolling ancient parchment scroll with glowing blue magical runes rising off the paper into the air, broken red wax seal, on a wizard's desk, still life", OBJECT_NEG),
("pf-resources_006", "Hired Sellsword", "a rugged human mercenary sellsword with a scarred face and mismatched armor pieces, leaning on a greatsword and counting gold coins in his palm, dim tavern background", ""),
("pf-resources_007", "Treasure Map", "an old parchment treasure map spread on a table and held down by a dagger and a brass compass, a red X marked on a drawn island that glows faintly, candlelight, still life", OBJECT_NEG),
("pf-resources_008", "Wand of Lightning", "a slender carved wooden wand crackling with branching blue-white lightning bolts, held in a gloved hand, storm energy arcing around it, dark stormy background", ""),
("pf-resources_009", "Elixir of Life", "an ornate crystal vial of shimmering golden elixir with swirling light inside, resting on a velvet cushion in an old alchemist's laboratory, glowing particles in the air, still life", OBJECT_NEG),
# ── EQUIPAMENTOS (o objeto em destaque) ──
("pf-equipment_001", "Longsword", "a finely made steel longsword plunged point-first deep into a cracked grey boulder, the lower third of the blade buried inside the rock, the sword standing perfectly upright, simple cross guard and leather-wrapped grip, sunlight glinting along the blade, glowing forge embers in the background, still life", OBJECT_NEG),
("pf-equipment_002", "Steel Shield", "a battered round steel shield covered in dents and scratches with two arrows stuck in it, leaning against a stone wall, dramatic light, still life", OBJECT_NEG),
("pf-equipment_003", "Chain Mail", "a suit of chain mail armor displayed on a wooden armor stand in an armory, the metal rings glinting in lamplight, still life", OBJECT_NEG),
("pf-equipment_004", "Longbow", "an elegant yew longbow with a quiver of arrows resting on a mossy rock in a forest, soft sunlight through the leaves, still life", OBJECT_NEG),
("pf-equipment_005", "Elven Boots", "a pair of soft elven leather boots with leaf embroidery standing on fresh untouched snow without footprints, faint green magical glow, still life", OBJECT_NEG),
("pf-equipment_006", "Warding Amulet", "a silver protective amulet with a blue gemstone hanging from a chain, surrounded by a faint shimmering protective bubble of light, held by an old wrinkled hand", ""),
("pf-equipment_007", "Flaming Rune", "a glowing fiery rune being carved into a sword blade by a dwarven smith's chisel, the rune burning orange-red, sparks flying, forge in the background", ""),
("pf-equipment_008", "Holy Avenger", "a magnificent holy longsword with a golden hilt and wing-shaped cross guard, radiating divine white-gold light, floating above a cathedral altar, still life", OBJECT_NEG),
("pf-equipment_009", "Robe of the Archmagi", "an ornate deep blue wizard robe with shimmering silver arcane embroidery, displayed on a wooden mannequin inside a wizard's tower, floating glowing runes around it, still life", OBJECT_NEG),
]
assert len(C) == 81 and len({c[0] for c in C}) == 81

pf = json.load(open(os.path.join(RAIZ, 'src/data/pf-cards.json')))
names = {f"pf-{c['deck']}_{c['n']:03d}": c['text'] for c in pf}
out = []
for cid, en, scene, neg in C:
    deck = cid[3:].split('_')[0]
    assert cid in names, cid
    assert names[cid]['en-US']['name'].replace('’', "'") == en.replace('’', "'"), (cid, names[cid]['en-US']['name'], en)
    prompt = f"{STYLE}, {scene}, {PALETTE[deck]}, {COMPOSITION}"
    out.append({"id": cid, "nome": names[cid]['pt-BR']['name'], "name": en, "prompt": prompt,
                "negative": NEG + (", " + neg if neg else "")})
json.dump({"_leia": "Prompts das 81 cartas da coleção Classes (Pathfinder). O arquivo de cada imagem deve se chamar <id>.png (ex.: pf-red_001.png) para a importação em lote do Void Sun.",
           "cards": out}, open(os.path.join(RAIZ, 'tools/comfyui/prompts-pf.json'), 'w'), ensure_ascii=False, indent=1)

# versão para copiar e colar (outras IAs)
md = ["# Prompts das artes — coleção Classes (Pathfinder)", "",
      "Um prompt por carta, no estilo das artes de Magic: The Gathering. Salve cada imagem com o **nome do arquivo** indicado",
      "(ex.: `pf-red_001.png`) e use **Biblioteca → Importar artes** para colocar todas nas cartas de uma vez.", "",
      "Em IAs sem campo de \"prompt negativo\" (ChatGPT, Midjourney…), cole só o prompt e acrescente no fim: *no text, no letters, no card frame*.", ""]
DECKS = {'red': 'Vermelho — Guerreiro / Bárbaro', 'blue': 'Azul — Mago / Feiticeiro', 'green': 'Verde — Druida / Patrulheiro', 'black': 'Preto — Necromante / Bruxo',
         'purple': 'Roxo — Ladino / Assassino', 'white': 'Bege — Clérigo / Paladino', 'silver': 'Prata — Monge / Bardo', 'resources': 'Recursos', 'equipment': 'Equipamentos'}
last = None
for o in out:
    deck = o['id'][3:].split('_')[0]
    if deck != last:
        md += [f"## {DECKS[deck]}", ""]; last = deck
    md += [f"### {o['nome']} — arquivo `{o['id']}.png`", "", "**Prompt:**", "```", o['prompt'], "```", "**Negativo:**", "```", o['negative'], "```", ""]
open(os.path.join(RAIZ, 'docs/prompts-pf.md'), 'w').write("\n".join(md))
print(len(out), "prompts ok")
