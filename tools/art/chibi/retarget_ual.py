"""
Passa animações da "Universal Animation Library" (Quaternius, CC0 — feitas por animador) para o esqueleto chibi.

O esqueleto de origem está em T e tem proporções de adulto realista; o nosso tem braços mais baixos e pernas curtas.
Para cada osso e quadro: pega-se a rotação que o osso de origem fez em relação ao seu repouso (no espaço do mundo)
e aplica-se ao nosso osso, corrigindo a diferença de direção entre os dois repousos. O deslocamento do quadril é
escalado pela razão entre os comprimentos das pernas, para os pés continuarem no chão.

Uso: blender -b personagem.blend --python retarget_ual.py -- AnimationLibrary.glb saida.blend
"""
import bpy, sys, math
from mathutils import Vector, Matrix, Quaternion

a = sys.argv[sys.argv.index('--') + 1:]
lib, dst = a[0], a[1]
sc = bpy.context.scene
tgt = bpy.data.objects['Heroi']
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=lib)
new = [o for o in bpy.data.objects if o not in before]
src = next(o for o in new if o.type == 'ARMATURE')

# nome do clipe no jogo: lista de (ação de origem, repete?) em sequência
CLIPS = {
    'Parado': [('Idle_Loop', True)], 'Andar': [('Walk_Loop', True)], 'Correr': [('Jog_Fwd_Loop', True)],
    'Guarda': [('Sword_Idle', True)], 'Golpe': [('Sword_Attack', False)],
    'Conjurar': [('Spell_Simple_Enter', False), ('Spell_Simple_Shoot', False), ('Spell_Simple_Exit', False)],
    'Dano': [('Hit_Chest', False)], 'Morte': [('Death01', False)],
}
names = [b.name for b in tgt.data.bones if b.name in src.data.bones]
sb = {n: src.data.bones[n] for n in names}; tb = {n: tgt.data.bones[n] for n in names}
rest_s = {n: sb[n].matrix_local.to_3x3() for n in names}; rest_t = {n: tb[n].matrix_local.to_3x3() for n in names}
def direction(b): return (b.tail_local - b.head_local).normalized()
# A correção de repouso só vale onde a POSE da malha difere de fato (braços em T na origem, mais baixos na nossa;
# pernas). Em coluna, pescoço, cabeça, ombros e pés a diferença é só de onde o osso foi desenhado: corrigir ali
# entortaria a malha (era o que deixava a cabeça caída para a frente).
POSED = ('DEF-upper_arm', 'DEF-forearm', 'DEF-hand', 'DEF-thigh', 'DEF-shin')
corr = {n: (direction(tb[n]).rotation_difference(direction(sb[n])).to_matrix() if n.startswith(POSED) else Matrix.Identity(3)) for n in names}
def leg(bones, S): return (bones[f'DEF-thigh.{S}'].tail_local - bones[f'DEF-thigh.{S}'].head_local).length + (bones[f'DEF-shin.{S}'].tail_local - bones[f'DEF-shin.{S}'].head_local).length
K = leg(tgt.data.bones, 'L') / leg(src.data.bones, 'L')
hips_rest_s = sb['DEF-hips'].matrix_local.translation.copy()
print('RAZAO_PERNAS', round(K, 3), 'ossos', len(names))

# A cabeça chibi é enorme e a franja cobre os olhos: a leve inclinação para a frente que fica natural num adulto
# realista aqui parece cabeça baixa/cansaço. Ergue-se pescoço e cabeça alguns graus, no eixo lateral do personagem.
I3 = Matrix.Identity(3)
LIFT = {'DEF-neck': Matrix.Rotation(math.radians(-7), 3, 'X'), 'DEF-head': Matrix.Rotation(math.radians(-11), 3, 'X'), 'DEF-spine.003': Matrix.Rotation(math.radians(-3), 3, 'X')}
LEVEL = {'DEF-neck': 0.4, 'DEF-head': 0.65}
# Com a cabeça chibi e a câmera vista de cima, qualquer inclinação para a frente esconde o rosto atrás do cabelo. Com
# --cabeca-erguida a cabeça fica de pé nas ações (até 40° de inclinação do corpo); na queda (Morte) vale a regra antiga.
CHIBI = '--corrida-chibi' in sys.argv; TRONCO = 0.6; PASSADA = 16.0      # quanto da inclinação do tronco sai; graus que a passada avança
ERGUIDA = '--cabeca-erguida' in sys.argv; LEVEL_ACAO = {'DEF-neck': 0.6, 'DEF-head': 1.0}; LIMITE = math.radians(55); QUEIXO = {'DEF-neck': 3.0, 'DEF-head': 8.0}
src.animation_data_create(); tgt.animation_data_create()
FPS = 24; sc.render.fps = FPS
order = [b.name for b in tgt.data.bones if b.name in names]          # pais antes dos filhos
info = {}
for clip, parts in CLIPS.items():
    act = bpy.data.actions.new(clip); act.use_fake_user = True
    tgt.animation_data.action = act
    frame = 0; prev = {}
    for pi, (sname, loop) in enumerate(parts):
        sa = bpy.data.actions[sname]
        src.animation_data.action = sa
        try: src.animation_data.action_slot = sa.slots[0]
        except Exception: pass
        end = sa.frame_range[1]; n = max(1, round(end))
        for i in range(0 if pi == 0 else 1, n + 1):
            t = i * end / n
            sc.frame_set(int(math.floor(t)), subframe=t - math.floor(t))
            pose = {}
            for nme in order:
                ps = src.pose.bones[nme].matrix.to_3x3().normalized()
                D = ps @ rest_s[nme].inverted()
                pose[nme] = D @ LIFT.get(nme, I3) @ corr[nme] @ rest_t[nme]
                if nme in LEVEL:      # mantém o olhar mais nivelado: desfaz parte da inclinação para a frente que sobrou
                    d_ = pose[nme] @ (rest_t[nme].inverted() @ direction(tb[nme]))
                    pitch = math.atan2(-d_.y, d_.z)
                    if ERGUIDA and clip != 'Morte':
                        # cabeça de pé: mantém só para onde ela está virada (giro em torno do eixo vertical) e tira a inclinação
                        # para a frente e para os lados, em qualquer direção do corpo; queixo um pouco erguido para a câmera alta
                        Dm = pose[nme] @ rest_t[nme].inverted(); f = Dm @ Vector((0, -1, 0))
                        alvo = Matrix.Rotation(math.atan2(f.x, -f.y), 3, 'Z') @ Matrix.Rotation(math.radians(-QUEIXO[nme]), 3, 'X')
                        qa, qb = Dm.to_quaternion(), alvo.to_quaternion(); ang = qa.rotation_difference(qb).angle
                        fr = LEVEL_ACAO[nme] * (1.0 if ang <= LIMITE else LIMITE / ang)
                        pose[nme] = qa.slerp(qb, fr).to_matrix() @ rest_t[nme]
                    else: pose[nme] = Matrix.Rotation(-LEVEL[nme] * pitch, 3, 'X') @ pose[nme]
            if CHIBI and clip in ('Correr', 'Andar'):
                # Corrida de chibi: a original é de adulto, com o tronco bem inclinado e a passada quase toda para trás do
                # corpo. Com pernas curtas e roupa volumosa, a perna de trás some e parece que ele manca. Aqui o tronco fica
                # mais de pé e a passada é trazida para a frente, para as duas pernas aparecerem alternando.
                for nme in order:
                    if any(k in nme for k in ('hips', 'spine')):
                        d_ = pose[nme] @ (rest_t[nme].inverted() @ direction(tb[nme])); pose[nme] = Matrix.Rotation(-TRONCO * math.atan2(-d_.y, d_.z), 3, 'X') @ pose[nme]
                    elif any(k in nme for k in ('thigh', 'shin', 'foot', 'toe')): pose[nme] = Matrix.Rotation(math.radians(-PASSADA), 3, 'X') @ pose[nme]
            for nme in order:
                pb = tgt.pose.bones[nme]; par = tb[nme].parent
                if par is not None and par.name in pose:
                    basis = (rest_t[par.name].inverted() @ rest_t[nme]).inverted() @ pose[par.name].inverted() @ pose[nme]
                elif par is not None:        # pai fora do conjunto (não acontece com este esqueleto)
                    basis = rest_t[nme].inverted() @ pose[nme]
                else:
                    basis = rest_t[nme].inverted() @ pose[nme]
                q = basis.to_quaternion()
                if nme in prev and prev[nme].dot(q) < 0: q.negate()
                prev[nme] = q.copy()
                pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=frame)
                if nme == 'DEF-hips':
                    dp = (src.pose.bones[nme].matrix.translation - hips_rest_s) * K
                    pb.location = rest_t[nme].inverted() @ dp
                    pb.keyframe_insert('location', frame=frame)
            frame += 1
    last = frame - 1
    act.use_frame_range = True; act.frame_start = 0; act.frame_end = last; act.use_cyclic = all(l for _, l in parts)
    info[clip] = last
    print('CLIPE', clip, 'quadros', last + 1, 'duração', round(last / FPS, 2), 's')

for o in new:
    try: bpy.data.objects.remove(o)
    except Exception: pass
for act in list(bpy.data.actions):
    if act.name not in CLIPS: bpy.data.actions.remove(act)
tgt.animation_data.action = None
for pb in tgt.pose.bones:
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
tgt['vs_clipes'] = ','.join(f'{k}:{v}' for k, v in info.items())
bpy.ops.wm.save_as_mainfile(filepath=dst)
print('ANIM_OK', dst)
