#!/usr/bin/env python3
"""
Monta a coleção de símbolos 3D (Fluent Emoji 3D, da Microsoft, licença MIT) usada
como opção de símbolo de custo, classe, ataque e defesa.

Baixa os PNG de 256 px do repositório microsoft/fluentui-emoji (uma vez, para
~/Projetos/sprites-fonte/fluent3d), reduz para 128 px e grava tudo embutido em
src/render/icons/icons3d.ts — embutido porque a carta é um SVG só, e imagens de
fora não aparecem quando ele vira PNG/PDF.
"""
import base64, io, json, os, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.expanduser('~/Projetos/sprites-fonte/fluent3d')
RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'

# nome no repositório → (português, inglês)
ICONS = {
    'Red heart': ('Coração', 'Heart'), 'High voltage': ('Raio', 'Lightning'), 'Drop of blood': ('Gota de sangue', 'Blood drop'), 'Orange heart': ('Coração laranja', 'Orange heart'),
    'Fire': ('Fogo', 'Fire'), 'Collision': ('Impacto', 'Impact'), 'Anger symbol': ('Fúria', 'Anger'), 'Volcano': ('Vulcão', 'Volcano'), 'Bomb': ('Bomba', 'Bomb'),
    'Droplet': ('Gota', 'Droplet'), 'Gem stone': ('Gema', 'Gem'), 'Crystal ball': ('Bola de cristal', 'Crystal ball'), 'Large blue diamond': ('Losango azul', 'Blue diamond'), 'Sparkles': ('Brilhos', 'Sparkles'),
    'Cyclone': ('Espiral', 'Swirl'), 'Snowflake': ('Floco de neve', 'Snowflake'), 'Water wave': ('Onda', 'Wave'), 'Blue heart': ('Coração azul', 'Blue heart'),
    'Leaf fluttering in wind': ('Folhas ao vento', 'Leaves in the wind'), 'Four leaf clover': ('Trevo', 'Clover'), 'Herb': ('Ramo', 'Herb'), 'Seedling': ('Broto', 'Seedling'), 'Evergreen tree': ('Pinheiro', 'Pine'),
    'Maple leaf': ('Folha de bordo', 'Maple leaf'), 'Mushroom': ('Cogumelo', 'Mushroom'), 'Green heart': ('Coração verde', 'Green heart'),
    'Skull': ('Caveira', 'Skull'), 'Ghost': ('Fantasma', 'Ghost'), 'Skull and crossbones': ('Caveira e ossos', 'Skull and bones'), 'Coffin': ('Caixão', 'Coffin'),
    'New moon': ('Lua nova', 'New moon'), 'Crescent moon': ('Lua crescente', 'Crescent moon'), 'Black heart': ('Coração negro', 'Black heart'), 'Bat': ('Morcego', 'Bat'), 'Spider web': ('Teia', 'Web'), 'Purple heart': ('Coração roxo', 'Purple heart'),
    'Sun': ('Sol', 'Sun'), 'Star': ('Estrela', 'Star'), 'Glowing star': ('Estrela brilhante', 'Glowing star'), 'Candle': ('Vela', 'Candle'), 'Dove': ('Pomba', 'Dove'), 'White heart': ('Coração branco', 'White heart'),
    'Eye': ('Olho', 'Eye'), 'Dizzy': ('Estrela cadente', 'Shooting star'), 'Bullseye': ('Alvo', 'Bullseye'), 'Brain': ('Mente', 'Mind'), 'Hourglass done': ('Ampulheta', 'Hourglass'), 'Comet': ('Cometa', 'Comet'),
    'Coin': ('Moeda', 'Coin'), 'Money bag': ('Saco de ouro', 'Gold bag'), 'Crown': ('Coroa', 'Crown'), 'Key': ('Chave', 'Key'), 'Ring': ('Anel', 'Ring'), 'Yellow heart': ('Coração dourado', 'Golden heart'),
    'Crossed swords': ('Espadas cruzadas', 'Crossed swords'), 'Dagger': ('Adaga', 'Dagger'), 'Bow and arrow': ('Arco e flecha', 'Bow and arrow'), 'Axe': ('Machado', 'Axe'), 'Hammer': ('Martelo', 'Hammer'),
    'Shield': ('Escudo', 'Shield'), 'Castle': ('Castelo', 'Castle'),
    'Magic wand': ('Varinha', 'Wand'), 'Blue book': ('Grimório', 'Spellbook'), 'Scroll': ('Pergaminho', 'Scroll'), 'Wolf': ('Lobo', 'Wolf'), 'Dragon': ('Dragão', 'Dragon'), 'Trident emblem': ('Tridente', 'Trident'),
    'Hammer and wrench': ('Ferramentas', 'Tools'), 'Gear': ('Engrenagem', 'Gear'), 'Pick': ('Picareta', 'Pickaxe'),
    'Red circle': ('Orbe vermelho', 'Red orb'), 'Orange circle': ('Orbe laranja', 'Orange orb'), 'Yellow circle': ('Orbe dourado', 'Golden orb'), 'Green circle': ('Orbe verde', 'Green orb'),
    'Blue circle': ('Orbe azul', 'Blue orb'), 'Purple circle': ('Orbe roxo', 'Purple orb'), 'Black circle': ('Orbe negro', 'Black orb'), 'White circle': ('Orbe branco', 'White orb'),
}
# opções por uso (a ordem é a da lista do editor)
USES = {
    'res:vigor': ['Red heart', 'High voltage', 'Drop of blood', 'Orange heart', 'Red circle'],
    'res:fury': ['Fire', 'Collision', 'Anger symbol', 'Volcano', 'Bomb', 'Orange circle'],
    'res:mana': ['Droplet', 'Gem stone', 'Crystal ball', 'Large blue diamond', 'Sparkles', 'Cyclone', 'Snowflake', 'Water wave', 'Blue heart', 'Blue circle'],
    'res:nature': ['Leaf fluttering in wind', 'Four leaf clover', 'Herb', 'Seedling', 'Evergreen tree', 'Maple leaf', 'Mushroom', 'Green heart', 'Green circle'],
    'res:souls': ['Skull', 'Ghost', 'Skull and crossbones', 'Coffin', 'White circle'],
    'res:shadow': ['New moon', 'Crescent moon', 'Black heart', 'Bat', 'Spider web', 'Purple heart', 'Purple circle', 'Black circle'],
    'res:faith': ['Sun', 'Star', 'Glowing star', 'Candle', 'Dove', 'White heart', 'Yellow circle'],
    'res:focus': ['Eye', 'Dizzy', 'Bullseye', 'Brain', 'Hourglass done', 'Comet'],
    'res:gold': ['Coin', 'Money bag', 'Crown', 'Key', 'Ring', 'Yellow heart'],
    'atk': ['Crossed swords', 'Dagger', 'Bow and arrow', 'Axe', 'Hammer', 'Collision', 'Fire'],
    'def': ['Shield', 'Red heart', 'Blue heart', 'Castle'],
    'cls:red': ['Crossed swords', 'Axe', 'Fire', 'Hammer'], 'cls:blue': ['Magic wand', 'Crystal ball', 'Blue book', 'Sparkles'],
    'cls:green': ['Bow and arrow', 'Wolf', 'Evergreen tree', 'Leaf fluttering in wind'], 'cls:black': ['Skull', 'Coffin', 'Bat', 'Ghost'],
    'cls:purple': ['Dagger', 'New moon', 'Spider web'], 'cls:white': ['Shield', 'Sun', 'Dove', 'Candle'],
    'cls:silver': ['Scroll', 'Star', 'Dragon'], 'cls:orange': ['Trident emblem', 'Brain', 'Eye'], 'cls:gear': ['Hammer and wrench', 'Gear', 'Pick', 'Key'],
}

slug = lambda n: n.lower().replace(' ', '_')
key = lambda n: 'f3d-' + n.lower().replace(' ', '-')


def main():
    os.makedirs(SRC, exist_ok=True)
    out = {}
    for name, (pt, en) in ICONS.items():
        p = os.path.join(SRC, slug(name) + '.png')
        if not os.path.exists(p):
            url = RAW + urllib.parse.quote(name) + '/3D/' + slug(name) + '_3d.png'
            print('baixando', url)
            urllib.request.urlretrieve(url, p)
        im = Image.open(p).convert('RGBA').resize((128, 128), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=90, method=6)
        out[key(name)] = {'pt': pt, 'en': en, 'src': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}
    uses = {u: [key(n) for n in names] for u, names in USES.items()}
    with open(os.path.join(ROOT, 'src/render/icons/icons3d.ts'), 'w') as f:
        f.write('/**\n * Símbolos 3D — Fluent Emoji 3D (Microsoft, licença MIT), reduzidos para 128 px e embutidos.\n * Arquivo gerado por tools/icons3d/montar.py — não edite à mão.\n */\n')
        f.write('export interface Icon3D { pt: string; en: string; src: string }\n')
        f.write('export const ICONS3D: Record<string, Icon3D> = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
        f.write('/** Opções 3D por uso (custo de cada recurso, classe de cada deck, ataque, defesa). */\n')
        f.write('export const CHOICES3D: Record<string, string[]> = ' + json.dumps(uses, indent=1) + ';\n')
    print(len(out), 'símbolos;', sum(len(v['src']) for v in out.values()) // 1024, 'KB embutidos')


if __name__ == '__main__':
    main()
