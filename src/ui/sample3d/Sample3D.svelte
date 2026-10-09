<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, RotateCcw, RotateCw, Plus, Minus, Flame, Snowflake, Move, RefreshCw } from '@lucide/svelte';
  import { router } from '../../app/router.svelte';
  import type { Label, ArenaStats, SampleArena } from './arena';
  import type { CameraView } from './layout';
  import { SAMPLE_DIRECTIONS, type SampleEquipment, type SampleDirection } from './directional';
  let clean=$state(false);
  function toggleClean(){clean=!clean;arena?.setSlots(!clean&&slots);}
  let workshop=$state(false),gearVisible=$state(false);
  let look=$state<'heroi'|'chibi'|'sprite'>('heroi');
  let cabelo=$state(true),faixa=$state(true),armadura=$state(true);
  // a armadura original do guerreiro: uma malha contínua presa ao esqueleto (dobra nas juntas sem abrir)
  const ARMADURA=['Armadura','Malha'];
  function setArmadura(){for(const p of ARMADURA)arena?.setHeroPiece(p,armadura);}
  let pixelated=$state(true),pixels=$state(72);
  function setLook(v:typeof look){look=v;arena?.setHeroLook(v);}
  function setPixels(){arena?.setChibiPixels(pixelated?pixels:0);}
  let gear=$state<Record<SampleEquipment,boolean>>({armor:true,helmet:true,weapon:true});
  const gearLabels:Record<SampleEquipment,string>={armor:'Peitoral',helmet:'Elmo',weapon:'Espada'};
  const viewLabels:Record<SampleDirection,string>={s:'Frente',se:'Frente ↗',e:'Direita',ne:'Costas ↗',n:'Costas',nw:'Costas ↖',w:'Esquerda',sw:'Frente ↖'};
  let canvas:HTMLCanvasElement;
  let arena:SampleArena|undefined;
  let loading=$state(true), error=$state(''), note=$state('Preparando o pátio…');
  let view=$state<CameraView>('isometric'), wind=$state(true), water=$state(true), slots=$state(true), equipped=$state(true);
  let mode=$state<'inspect'|'move'|'fire'|'ice'>('inspect');
  let labels=$state<Label[]>([]),stats=$state<ArenaStats>({fps:0,draws:0,triangles:0,particles:0,crate:{x:0,y:0,alive:true},slots:[]});
  onMount(()=>{
    let stopped=false;
    const resize=new ResizeObserver(()=>arena?.resize());resize.observe(canvas);
    void import('./arena').then(async({SampleArena})=>{
      if(stopped)return;
      arena=new SampleArena(canvas,v=>labels=v,v=>stats=v,v=>note=v,v=>error=v);
      await arena.load();if(!stopped)loading=false;
    }).catch(e=>{if(!stopped){error=String(e.message??e);loading=false;}});
    return()=>{stopped=true;resize.disconnect();arena?.dispose();};
  });
  function camera(v:CameraView){view=v;arena?.setCamera(v);}
  function action(v:typeof mode){mode=v;arena?.action(v);}
  function key(e:KeyboardEvent){if(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;
    if(e.key.toLowerCase()==='h')toggleClean();if(e.key==='Escape')action('inspect');if(e.key==='1')action('fire');if(e.key==='2')action('ice');if(e.key.toLowerCase()==='m')action('move');if(e.key.toLowerCase()==='r')arena?.restoreCrate();
  }
</script>
<svelte:window onkeydown={key}/>
<div class="sample" class:clean data-sample-ready={!loading&&!error}>
  <header>
    <button class="back" onclick={()=>router.go('/batalha')}><ArrowLeft size={16}/> Batalha</button>
    <div class="title"><small>VOID SUN · AMOSTRA VISUAL</small><h1>Pátio do Sol Ausente</h1></div>
    <button class="workshop-button" onclick={toggleClean} style="margin-left:auto">{clean?'Mostrar interface':'Limpar tela'} · H</button>
    <button class="workshop-button" style="margin-left:0" disabled={loading||!!error} onclick={()=>workshop=!workshop}>Modelos e equipamentos</button>
    <div class="cameras" aria-label="Câmera da arena">
      <button class:on={view==='classic'} disabled={loading||!!error} onclick={()=>camera('classic')}>Clássica</button>
      <button class:on={view==='isometric'} disabled={loading||!!error} onclick={()=>camera('isometric')}>Isométrica</button>
    </div>
  </header>
  <div class="stage">
    <canvas bind:this={canvas} aria-label="Arena 3D interativa. Arraste para girar, use a roda ou pinça para aproximar. Clique para selecionar alvos."></canvas>
    {#each labels as label (label.id)}
      <div class="label" class:selected={label.selected} class:enemy={label.enemy} style:left="{label.x}%" style:top="{label.y}%"><span></span>{label.name}</div>
    {/each}
    <div class="scene-caption"><b>O rio ainda guarda a luz.</b><span>Sob as ruínas, o selo do Sol Vazio desperta.</span></div>
    <div class="orbit">
      <button title="Girar para a esquerda" aria-label="Girar para a esquerda" onclick={()=>arena?.rotate(-Math.PI/4)}><RotateCcw size={17}/></button>
      <button title="Girar para a direita" aria-label="Girar para a direita" onclick={()=>arena?.rotate(Math.PI/4)}><RotateCw size={17}/></button>
      <span></span>
      <button title="Aproximar" aria-label="Aproximar" onclick={()=>arena?.changeZoom(.15)}><Plus size={17}/></button>
      <button title="Afastar" aria-label="Afastar" onclick={()=>arena?.changeZoom(-.15)}><Minus size={17}/></button>
    </div>
    {#if workshop}
      <aside class="workshop" aria-label="Amostra de personagem em oito direções">
        <div class="workshop-title"><b>Personagem de teste</b><button aria-label="Fechar oficina" onclick={()=>workshop=false}>×</button></div>
        <div class="looks"><button class:on={look==='heroi'} onclick={()=>setLook('heroi')}>Herói novo</button><button class:on={look==='chibi'} onclick={()=>setLook('chibi')}>Chibi original</button><button class:on={look==='sprite'} onclick={()=>setLook('sprite')}>Brunhild 2D</button></div>
        {#if look==='heroi'}
        <p>Corpo-base próprio com a cabeça e a armadura do guerreiro chibi em peças. Tem esqueleto: corre, golpeia e troca peças.</p>
        <button class="inspect" onclick={()=>arena?.viewSampleDirection('s')}>Ver personagem de perto</button>
        <div class="direction-grid" aria-label="Vistas do personagem">{#each SAMPLE_DIRECTIONS as d}<button aria-label={'Ver '+viewLabels[d]} onclick={()=>arena?.viewSampleDirection(d)}>{viewLabels[d]}</button>{/each}</div>
        <div class="gear-list"><label class="check"><input type="checkbox" bind:checked={cabelo} onchange={()=>arena?.setHeroPiece('Cabelo',cabelo)}/>Cabelo</label><label class="check"><input type="checkbox" bind:checked={faixa} onchange={()=>arena?.setHeroPiece('Faixa',faixa)}/>Faixa</label><label class="check"><input type="checkbox" bind:checked={armadura} onchange={setArmadura}/>Armadura</label></div>
        <label class="check"><input type="checkbox" bind:checked={pixelated} onchange={setPixels}/> Pixelizar o personagem</label>
        <label class="slider"><span>Altura em pixels</span><b>{pixelated?pixels:'liso'}</b><input type="range" min="32" max="200" step="4" disabled={!pixelated} bind:value={pixels} oninput={setPixels}/></label>
        <div class="looks"><button onclick={()=>arena?.playHero('Golpe')}>Golpear</button><button onclick={()=>arena?.playHero('Conjurar')}>Conjurar</button><button onclick={()=>arena?.playHero('Dano')}>Dano</button></div>
        <button class="inspect" onclick={()=>arena?.walkSample(!stats.walkingDemo)}>{stats.walkingDemo?'Parar corrida':'Correr nas oito direções'}</button>
        <small>Cabeça, cabelo, faixa e armadura derivados de “Chibi Armored Warrior”, de Elif Romero (Sketchfab, CC BY 4.0). Animações: Universal Animation Library (Quaternius, CC0).</small>
        {:else if look==='chibi'}
        <p>Modelo 3D parado: ainda não tem esqueleto, então desliza sem animar.</p>
        <button class="inspect" onclick={()=>arena?.viewSampleDirection('s')}>Ver personagem de perto</button>
        <div class="direction-grid" aria-label="Vistas do personagem">{#each SAMPLE_DIRECTIONS as d}<button aria-label={'Ver '+viewLabels[d]} onclick={()=>arena?.viewSampleDirection(d)}>{viewLabels[d]}</button>{/each}</div>
        <label class="check"><input type="checkbox" bind:checked={pixelated} onchange={setPixels}/> Pixelizar o personagem</label>
        <label class="slider"><span>Altura em pixels</span><b>{pixelated?pixels:'liso'}</b><input type="range" min="32" max="200" step="4" disabled={!pixelated} bind:value={pixels} oninput={setPixels}/></label>
        <button class="inspect" onclick={()=>arena?.walkSample(!stats.walkingDemo)}>{stats.walkingDemo?'Parar percurso':'Percorrer as oito direções'}</button>
        <p>O pixel acompanha o personagem: aproximar a câmera aumenta os pixels, sem mudar a quantidade.</p>
        <small>Modelo: “Chibi Armored Warrior”, de Elif Romero (Sketchfab, CC BY 4.0), reduzido para o teste.</small>
        {:else}
        <p>Brunhild · amostra 2D em oito vistas, com itens em camadas.</p>
        <button class="inspect" onclick={()=>arena?.viewSampleDirection('s')}>Ver personagem de perto</button>
        <div class="direction-grid" aria-label="Vistas do personagem">{#each SAMPLE_DIRECTIONS as d}<button class:on={stats.sprites?.[0]?.direction===d} aria-label={'Ver '+viewLabels[d]} onclick={()=>arena?.viewSampleDirection(d)}>{viewLabels[d]}</button>{/each}</div>
        <button class="inspect" onclick={()=>arena?.walkSample(!stats.walkingDemo)}>{stats.walkingDemo?'Parar corrida':'Iniciar corrida'}</button>
        <label class="check"><input type="checkbox" bind:checked={gearVisible} onchange={()=>arena?.setSampleEquipment(gearVisible)}/> Mostrar itens equipados</label>
        <div class="gear-list">{#each Object.entries(gearLabels) as [id,label]}<label class="check"><input type="checkbox" bind:checked={gear[id as SampleEquipment]} onchange={()=>arena?.setSampleGear(id as SampleEquipment,gear[id as SampleEquipment])}/>{label}</label>{/each}</div>
        <p>{gearVisible?'Elmo, peitoral e espada acompanham a vista e a passada.':'Visual cosmético. Ative os itens para comparar o encaixe.'}</p>
        {/if}
        <small>Teste temporário de um personagem. Kael e o esqueleto continuam com os visuais anteriores. As escolhas não alteram os heróis salvos.</small>
      </aside>
    {/if}
    <div class="legend"><span class="ally"></span> Seu campo <span class="foe"></span> Oponente</div>
    {#if loading||error}<div class="veil"><b>{error?'Não foi possível abrir a amostra':'Preparando o pátio…'}</b>{#if error}<p>{error}</p><button onclick={()=>router.go('/batalha')}>Voltar</button>{:else}<span class="loader"></span>{/if}</div>{/if}
  </div>
  <footer>
    <div class="actions">
      <button class:active={mode==='fire'} disabled={loading||!!error} onclick={()=>action('fire')}><Flame size={24}/><span><b>Brasa do Vazio</b><small>Fogo e destruição · 1</small></span></button>
      <button class:active={mode==='ice'} disabled={loading||!!error} onclick={()=>action('ice')}><Snowflake size={24}/><span><b>Lança de Geada</b><small>Gelo e cristais · 2</small></span></button>
      <button class:active={mode==='move'} disabled={loading||!!error} onclick={()=>action('move')}><Move size={22}/><span><b>Reposicionar</b><small>Segure um personagem · M</small></span></button>
      <button disabled={loading||!!error} onclick={()=>arena?.restoreCrate()}><RefreshCw size={20}/><span><b>Restaurar caixa</b><small>Repita a destruição · R</small></span></button>
    </div>
    <p class="note" aria-live="polite">{note}</p>
    <div class="options">
      <label><input type="checkbox" bind:checked={wind} onchange={()=>arena?.setWind(wind)}/> Vento</label>
      <label><input type="checkbox" bind:checked={water} onchange={()=>arena?.setWater(water)}/> Água animada</label>
      <label><input type="checkbox" bind:checked={slots} onchange={()=>arena?.setSlots(slots)}/> Mostrar slots</label>
      <label><input type="checkbox" bind:checked={equipped} onchange={()=>arena?.setEquipment(equipped)}/> Equipar esqueleto</label>
      <span class="fps">{stats.fps} fps</span>
    </div>
    <div class="pending"><span>W/S avançam e recuam · A/D andam de lado · Q/E descem e sobem · Shift acelera · Arraste para girar · Roda/pinça para zoom · Esc para selecionar · Câmeras fixas para reenquadrar</span></div>
  </footer>
  <output hidden data-arena-snapshot={JSON.stringify(stats)}></output>
</div>
<style>
  .sample{height:100%;min-height:0;flex:1;display:flex;flex-direction:column;background:#10191b;color:#efe9d6;font-family:var(--pixel-text);}
  header{flex-shrink:0;display:flex;align-items:center;gap:22px;padding:12px 24px;background:linear-gradient(#18252a,#111b20);border-bottom:1px solid #80734a;min-height:69px;z-index:1;}
  button{cursor:pointer;color:inherit;background:#1c292b;border:1px solid #536261;font:inherit;transition:background .15s,border-color .15s;}button:hover{background:#2d3e3e;border-color:#c5ad6a;}button:disabled{opacity:.4;cursor:wait;}button:focus-visible{outline:2px solid #ffdb88;outline-offset:3px;}
  .back{display:flex;align-items:center;gap:7px;padding:9px 12px;color:#c7d2ce;background:transparent;}
  .title small{color:#b8a26c;font-size:10px;letter-spacing:.2em;}h1{font:500 22px var(--serif,Georgia);margin:3px 0 0;letter-spacing:.025em;}
  .workshop-button{margin-left:auto;padding:10px 14px;} .cameras{display:flex;gap:5px;}.cameras button{padding:10px 20px;font-weight:600;}.cameras .on{background:#ad955b;color:#101917;border-color:#dac990;}
  .stage{position:relative;flex:1;min-height:180px;overflow:hidden;}canvas{position:absolute;inset:0;display:block;width:100%;height:100%;image-rendering:auto;touch-action:none;}
  .label{position:absolute;transform:translate(-50%,-100%);padding:3px 9px;background:#111b20cc;border:1px solid #acc9c166;border-radius:3px;pointer-events:none;font-size:12px;display:flex;align-items:center;gap:6px;color:#f2ead5;box-shadow:0 2px 8px #0003;}
  .label span{background:#82c6c9;border-radius:100%;width:5px;height:5px;}.label.enemy span{background:#e5b369;}.label.selected{border-color:#ecd28d;}
  .scene-caption{position:absolute;top:19px;left:25px;display:grid;gap:5px;color:#ffecd1;text-shadow:0 1px 4px #172322;pointer-events:none;background:#15222580;padding:10px 14px;border-left:2px solid #d1b77e;}.scene-caption b{font:500 17px var(--serif,Georgia);}.scene-caption span{font-size:12px;color:#e5e4ce;}
  .orbit{position:absolute;right:24px;top:20px;display:flex;gap:5px;}.orbit button{padding:8px;display:grid;place-items:center;background:#17252be8;}.orbit span{width:6px;}
  .legend{position:absolute;left:24px;bottom:17px;display:flex;gap:9px;align-items:center;font-size:12px;color:#f1e9d6;background:#142324cb;padding:7px 12px;}.legend span{width:6px;height:6px;}.ally{background:#8cced1;}.foe{background:#ddbd83;margin-left:10px;}
  footer{flex-shrink:0;border-top:1px solid #65745f;background:linear-gradient(#162326,#10191d);padding:12px 24px 9px;box-shadow:0 -6px 20px #141c1b28;}
  .actions{display:flex;justify-content:center;gap:9px;}.actions button{display:flex;text-align:left;gap:11px;align-items:center;padding:10px 18px;min-width:183px;}.actions :global(svg){color:#c6b777;}.actions span{display:grid;gap:3px;}.actions b{font-size:14px;font-weight:600;}.actions small{font-size:11px;color:#aabbb4;}.actions .active{border-color:#e8c677;background:#354036;box-shadow:inset 0 0 15px #d0b56c11;}.actions .active :global(svg){color:#ffe1a0;}
  .note{font-size:13px;text-align:center;margin:10px 0;color:#dddcc7;min-height:17px;}.options{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:22px;font-size:12px;color:#bbc7bc;}.options label{display:flex;align-items:center;gap:6px;cursor:pointer;}input{accent-color:#cfb577;}.fps{font-variant-numeric:tabular-nums;color:#86b49d;min-width:45px;}
  .pending{display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:10px;color:#a5afa3;margin-top:9px;}.veil{position:absolute;inset:0;background:#122025ed;display:grid;place-content:center;text-align:center;gap:20px;}.veil p{max-width:500px;}.veil button{padding:10px;}.loader{justify-self:center;width:30px;height:30px;border:2px solid #cfb376;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}
  .workshop{position:absolute;right:24px;top:65px;width:285px;max-height:calc(100% - 80px);overflow:auto;padding:15px;background:#102026f5;border:1px solid #b6a06c;box-shadow:0 8px 24px #0007;border-radius:5px;font-size:12px;z-index:2;}
  .direction-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0;}.direction-grid button{padding:6px 2px;font-size:10px;}.direction-grid .on{background:#6b6444;border-color:#dec587;}
  .slider{display:grid!important;grid-template-columns:1fr auto;gap:4px 8px;}.slider input{grid-column:1/-1;width:100%;}
  .clean .label,.clean .scene-caption,.clean .legend,.clean .orbit,.clean footer{display:none;}
  .looks{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:8px 0;}.looks button{padding:7px 2px;font-size:11px;}.looks .on{background:#ad955b;color:#101917;border-color:#dac990;}
  .workshop-title{display:flex;align-items:center;justify-content:space-between;font-size:15px;color:#efd5a0;margin-bottom:12px;}.workshop-title button{padding:2px 8px;font-size:20px;}.workshop>label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;}.inspect{width:100%;padding:8px;margin:3px 0 7px;}.workshop .check{justify-content:flex-start;gap:7px;}.gear-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:8px 0;border-top:1px solid #526058;}.gear-list label{display:flex;align-items:center;gap:6px;}.workshop p{font-size:11px;line-height:1.5;color:#c2cebf;}.workshop small{font-size:10px;color:#d5bd86;line-height:1.45;display:block;}
  @media(max-width:850px){header{padding:9px 12px;gap:8px;flex-wrap:wrap;}.workshop-button{font-size:11px;padding:7px;}.workshop{right:12px;top:53px;width:min(285px,calc(100% - 24px));}h1{font-size:18px;}.title small{font-size:8px;}.cameras button{padding:8px 10px;}footer{padding:8px 12px;}.actions{gap:5px;}.actions button{padding:8px;min-width:0;flex:1;gap:5px;}.actions b{font-size:11px;}.actions small{font-size:9px;}.actions :global(svg){width:18px;}.options{gap:9px;font-size:10px;}.scene-caption{left:12px;top:12px;}.scene-caption span{display:none;}.orbit{top:12px;right:12px;}.pending{font-size:9px;}}
</style>
