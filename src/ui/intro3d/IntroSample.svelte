<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '../../app/router.svelte';
  import { DjaboCinematic, type IntroSnapshot } from './cinematic';
  import { INTRO_DURATION, introFrame } from './timeline';
  let canvas = $state<HTMLCanvasElement>();
  let frame = $state<IntroSnapshot>({ ready:false, mode:'cinema', time:0, phase:'emergence', meshes:0, triangles:0, clips:[], effects:true, fps:0 });
  let error = $state('');
  let paused = $state(false);
  let effects = $state(true);
  let pixel = $state(2);
  let full = $state(false);
  let engine: DjaboCinematic | undefined;
  const signature = $derived(frame.mode === 'cinema' ? introFrame(frame.time).reveal : 0);
  function replay() { paused=false; engine?.replay(); }
  function inspect() { engine?.setMode('model'); engine?.seek(7); paused=true;engine?.pause(true); }
  function pause() { paused=!paused;engine?.pause(paused); }
  function seek(value: string) { paused=true;engine?.pause(true);engine?.seek(Number(value)); }
  onMount(() => {
    let raf=0, last=0, gone=false, observed=0;
    const resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;engine?.resize(r.width,r.height);});
    try {
      engine=new DjaboCinematic(canvas!);
      resize.observe(canvas!.parentElement!);
      void engine.load().catch(e=>{if(!gone) error=String(e?.message??e);});
      const render=(now:number)=>{
        if(gone)return;
        raf=requestAnimationFrame(render);
        if(document.hidden){last=now;return;}
        if(last && now-last<1000/60-0.5)return;
        const dt=last?Math.min((now-last)/1000,.06):0;last=now;
        engine?.update(dt);
        if(now-observed>45){frame=engine!.snapshot();observed=now;}
      };
      raf=requestAnimationFrame(render);
    } catch(e) {error=String(e);}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&full){e.preventDefault();full=false;}};
    addEventListener('keydown',key);
    return()=>{gone=true;cancelAnimationFrame(raf);resize.disconnect();removeEventListener('keydown',key);engine?.dispose();engine=undefined;};
  });
</script>

<div class="intro-sample" class:full data-intro-ready={frame.ready}>
  <header>
    <button class="back" onclick={()=>router.go('/')}>‹ Menu</button>
    <div><span class="eyebrow">Djabo · estudo cinematográfico</span><h1>Abertura 3D</h1></div>
    <button class="clean" onclick={()=>{full=true;replay();}}>Ver sem controles</button>
  </header>
  <div class="stage">
    <canvas bind:this={canvas} aria-label="Personagem Djabo em 3D com katana e efeitos separados"></canvas>
    <div class="letterbox top"></div><div class="letterbox bottom"></div>
    {#if !frame.ready && !error}<div class="loading"><span></span><p>Preparando a abertura…</p></div>{/if}
    {#if error}<div class="failure"><p>Não foi possível carregar a amostra.</p><small>{error}</small><button onclick={()=>router.go('/')}>Voltar ao menu</button></div>{/if}
    <div class="signature" style="opacity:{signature};transform:translateY({(1-signature)*12}px)">
      <p>Developed by</p><div class="divider"></div><h2>Djabo</h2><span class="seal">◆</span>
    </div>
    {#if frame.mode==='model'}<p class="orbit-hint">Arraste para girar · roda do mouse ou pinça para aproximar</p>{/if}
    {#if full}<button class="exit-full" onclick={()=>full=false}>Mostrar controles</button>{/if}
  </div>
  <footer>
    <div class="playback">
      <button class="primary" disabled={!frame.ready} onclick={replay}>Reproduzir abertura</button>
      <button disabled={!frame.ready} onclick={inspect}>Inspecionar modelo</button>
      <button disabled={!frame.ready} onclick={pause}>{paused?'Continuar':'Pausar'}</button>
      {#if frame.mode==='model'}<button onclick={()=>engine?.front()}>Ver de frente</button>{/if}
    </div>
    <div class="options">
      <label><input type="checkbox" bind:checked={effects} onchange={()=>engine?.setEffects(effects)} /> Auras e rastro</label>
      <label>Detalhe dos pixels <select bind:value={pixel} onchange={()=>engine?.setPixel(Number(pixel))}><option value={1}>Fino</option><option value={2}>Equilibrado</option><option value={3}>Marcado</option></select></label>
      <label class="scrub">Momento <input type="range" min="0" max={INTRO_DURATION} step="0.02" value={frame.time} oninput={e=>seek(e.currentTarget.value)} disabled={!frame.ready} /><span>{frame.time.toFixed(1)} s</span></label>
    </div>
    <p class="note">Amostra para avaliação · modelo, katana e efeitos independentes</p>
  </footer>
  <output hidden data-intro-snapshot={JSON.stringify(frame)}></output>
</div>

<style>
  .intro-sample{height:100%;display:flex;flex-direction:column;background:#07050c;color:#c8bfce;overflow:hidden}
  header{display:flex;align-items:center;gap:22px;padding:16px 28px;border-bottom:1px solid #261e30;background:#0b0810;flex:none}
  header h1{font:500 19px 'Cinzel',serif;margin:4px 0 0;color:#ece3de;letter-spacing:.05em}
  .eyebrow{font:400 10px 'Inter',sans-serif;text-transform:uppercase;letter-spacing:.18em;color:#987ba3}
  button,select{border:1px solid #41324d;background:#17101f;color:#dcd0e4;border-radius:4px;padding:10px 16px;font:400 12px 'Inter',sans-serif;cursor:pointer}
  button:hover{border-color:#8e59b1;background:#23162f}button:disabled{opacity:.35;cursor:default}button:focus-visible{outline:2px solid #b99ad3;outline-offset:3px}
  .back{padding:9px 13px}.clean{margin-left:auto;background:transparent}
  .stage{position:relative;flex:1;min-height:0;background:#07050c;overflow:hidden}
  canvas{display:block;width:100%;height:100%;touch-action:none;image-rendering:pixelated}
  .letterbox{position:absolute;left:0;right:0;height:6%;background:#030205;pointer-events:none}.top{top:0}.bottom{bottom:0}
  .signature{position:absolute;left:57%;top:37%;width:32%;text-align:center;pointer-events:none}
  .signature p{font:400 clamp(10px,1.2vw,16px) 'Cinzel',serif;letter-spacing:.32em;color:#b9a5bd;margin:0;text-transform:none}
  .divider{height:1px;width:28%;margin:20px auto 12px;background:linear-gradient(90deg,transparent,#9b627f,transparent)}
  .signature h2{font:500 clamp(60px,9vw,145px)/1.02 'Grenze Gotisch','Cormorant Garamond',serif;letter-spacing:.04em;margin:0;color:#e9dfe5;background:linear-gradient(180deg,#fff4ec 8%,#d0bbc9 64%,#825972 100%);background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 1px #150a1b)}
  .seal{display:block;font-size:10px;color:#ab517c;margin-top:22px;opacity:.75}
  .loading,.failure{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:15px;background:#07050c;font:400 13px 'Inter',sans-serif;z-index:4}.loading span{width:24px;height:24px;border:1px solid #583c68;border-top-color:#c087d8;border-radius:50%;animation:spin 1s linear infinite}.failure small{max-width:70%;color:#cd8d9e}
  footer{padding:17px 28px 12px;border-top:1px solid #261e30;background:#0b0810;flex:none}.playback,.options{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.primary{background:#352044;border-color:#81529f;color:#f1e4fa}.options{margin-top:14px;gap:24px;font:400 12px 'Inter',sans-serif}.options label{display:flex;align-items:center;gap:9px}.options input{accent-color:#a573c2}.options select{padding:6px 10px}.scrub{margin-left:auto}.scrub input{width:180px}.scrub span{min-width:40px;font-variant-numeric:tabular-nums}.note{font:400 10px 'Inter',sans-serif;color:#6f637b;margin:14px 0 0;letter-spacing:.03em}
  .orbit-hint{position:absolute;left:0;right:0;bottom:9%;text-align:center;font:400 12px 'Inter',sans-serif;color:#94829d;pointer-events:none}.exit-full{position:absolute;right:20px;bottom:20px;opacity:.3}.exit-full:hover{opacity:1}.full header,.full footer{display:none}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:700px){header{padding:12px;gap:10px}.clean{font-size:10px;padding:8px}footer{padding:12px}.options{gap:12px}.scrub{margin-left:0}.scrub input{width:130px}.signature{left:48%;width:49%;top:40%}.signature h2{font-size:70px}.signature p{font-size:10px}.eyebrow{font-size:8px}}
</style>
