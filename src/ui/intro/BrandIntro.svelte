<script lang="ts">
  import { onMount } from 'svelte';
  import { WORDMARK, LETTER_OFFSETS } from './brand';
  import { router } from '../../app/router.svelte';
  let { ondone }: { ondone?: () => void } = $props();
  const uid = $props.id();
  let t = $state(0);
  let paused = $state(false);
  let full = $state(false);
  let reduced = $state(false);
  let finished = false;
  const duration = 6.1;
  const ease = (n:number) => { n=Math.min(1,Math.max(0,n));return 1-Math.pow(1-n,3); };
  const appearance = $derived(ease(t/.48));
  const cut = $derived(ease((t-.68)/.18));
  const unfold = $derived(ease((t-.93)/.40));
  const starts = [1.35, 1.49, 1.63, 1.77];
  const travel = [12, 16, 14, 12];
  const letter = (i:number) => { const n=Math.min(1,Math.max(0,(t-starts[i])/.46)); return n*n*(3-2*n); };
  const logoFade = (time:number) => { const n=Math.min(1,Math.max(0,(time-2.32)/1.2)); return n*n*(3-2*n); };
  const logo = $derived(logoFade(t));
  const line = $derived(ease((t-.54)/.23));
  const lineAlpha = $derived(ease((t-.52)/.08)*(1-ease((t-.85)/.22)));
  const exit = $derived(ondone && !reduced ? ease((t-5.55)/.55) : 0);
  function done() { if(finished)return;finished=true;ondone?.(); }
  function replay() { t=reduced?4.0:0;paused=false; }
  function skip(e:Event) { if(!ondone)return;e.preventDefault();e.stopPropagation();done(); }
  onMount(()=>{
    reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced)t=4.0;
    let raf=0,last=0;
    const hold=(()=>{try{return !!sessionStorage.getItem('splash-hold');}catch{return false;}})();
    const fallback=ondone&&!hold?setTimeout(done,reduced?1800:7000):undefined;
    const animate=(now:number)=>{
      raf=requestAnimationFrame(animate);
      if(document.hidden){last=now;return;}
      if(last&&now-last<1000/60-.5)return;
      const dt=last?Math.min((now-last)/1000,.08):0;last=now;
      if(!paused&&!reduced)t=Math.min(duration,t+dt);
      if(ondone&&!hold&&t>=duration)done();
    };
    raf=requestAnimationFrame(animate);
    const key=(e:KeyboardEvent)=>{if(e.key==='Shift'||e.key==='Control'||e.key==='Alt'||e.key==='Meta')return;skip(e);};
    if(ondone)addEventListener('keydown',key,true);
    return()=>{cancelAnimationFrame(raf);clearTimeout(fallback);if(ondone)removeEventListener('keydown',key,true);};
  });
</script>

<div class="brand-screen" class:opening={!!ondone} class:full class:reduced data-brand-intro data-time={t.toFixed(2)}>
  {#if !ondone&&!full}<header><button onclick={()=>router.go('/')}>‹ Menu</button><span>Abertura Djabo</span><button class="cinema" onclick={()=>{full=true;replay();}}>Ver sem controles</button></header>{/if}
  <div class="stage" role="presentation" onpointerdown={skip}>
    <div class="composition" style="opacity:{1-exit};transform:scale({1+exit*.015})" aria-label="Developed by Djabo">
      <svg class="signature" viewBox="0 0 720 300" role="img" aria-label="Developed by Djabo">
        <title>Developed by Djabo</title>
        <defs>
          <mask id="{uid}-namecut" maskUnits="userSpaceOnUse" x="-20" y="-20" width="130" height="180"><rect x="-20" y="-20" width="130" height="180" fill="white"/><path d="M-2 74L86 27V35L-2 82Z" fill="black" opacity={cut}/></mask>
        </defs>
        <g transform="translate({323-98*unfold},95) scale(.9)">
          <g transform="translate(10) skewX(-8)" fill="#f5f5f5" fill-rule="evenodd">
            <path d={WORDMARK[0]} mask="url(#{uid}-namecut)" opacity={appearance}/>
            {#each [0,1,2,3] as i}
              <g opacity={letter(i)} data-letter={i} data-progress={letter(i).toFixed(3)}>
                <path d={WORDMARK[i+1]} transform="translate({LETTER_OFFSETS[i+1]-travel[i]*(1-letter(i))},0)"/>
              </g>
            {/each}
            <path d="M-12 83L96 25" fill="none" stroke="#fff" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset={1-line} opacity={lineAlpha}/>

          </g>
        </g>
        <!-- Selected artwork with genuine PNG alpha. Only opacity changes; placement stays fixed. -->
        <image href="brand/djabo-vector/symbol-selected-18-alpha.png" x="90" y="47" width="156" height="156" opacity={logo} data-devil-logo/>
        <text x="225" y="65" fill="#b5b5b5" class="byline" data-byline>DEVELOPED BY</text>
      </svg>
    </div>
    {#if ondone}<button class="skip" onclick={skip}>Pular abertura <span>↵</span></button>{/if}
    {#if full}<button class="exit-full" onclick={()=>full=false}>Mostrar controles</button>{/if}
  </div>
  {#if !ondone&&!full}
    <footer>
      <button class="primary" onclick={replay}>Repetir</button><button onclick={()=>paused=!paused}>{paused?'Continuar':'Pausar'}</button>
      <label>Momento <input type="range" min="0" max={duration} step=".02" value={t} oninput={e=>{paused=true;t=Number(e.currentTarget.value);}}/><span>{t.toFixed(1)} s</span></label>
    </footer>
  {/if}
</div>

<style>
  .brand-screen{height:100%;display:flex;flex-direction:column;background:#080808;color:#ddd;overflow:hidden;font-family:'Inter',sans-serif;user-select:none}
  .opening{position:fixed;inset:0;z-index:200}.stage{position:relative;flex:1;min-height:0;overflow:hidden;background:radial-gradient(ellipse at 50% 46%,#111111 0%,#080808 53%,#040404 100%)}
  .composition{position:absolute;inset:0;pointer-events:none}.signature{position:absolute;width:min(720px,86vw);height:auto;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible}
  .byline{font:400 12px 'Inter',sans-serif;letter-spacing:3.7px}
  header{height:64px;display:flex;align-items:center;gap:24px;padding:0 24px;border-bottom:1px solid #252525;font-size:11px;letter-spacing:.16em;color:#939393;text-transform:uppercase;flex:none}
  button{border:1px solid #363636;background:#101010;border-radius:2px;color:#bfbfbf;padding:10px 16px;font:400 11px 'Inter',sans-serif;cursor:pointer;letter-spacing:.03em}button:hover{color:#fff;border-color:#878787}button:focus-visible{outline:2px solid #fff;outline-offset:4px}.cinema{margin-left:auto}.primary{background:#eeeeee;color:#101010;border-color:#eeeeee}.primary:hover{color:#101010;background:#fff}
  footer{display:flex;align-items:center;gap:12px;padding:18px 24px;border-top:1px solid #252525;background:#0a0a0a;flex:none;font-size:11px}
  footer label{margin-left:auto;display:flex;align-items:center;gap:12px;color:#888888}footer input{width:180px;accent-color:#e1e1e1}footer label span{min-width:36px;font-variant-numeric:tabular-nums}
  .skip,.exit-full{position:absolute;right:26px;bottom:24px;border:0;background:transparent;font-size:10px;letter-spacing:.08em;color:#5f5f5f}.skip span{margin-left:14px;color:#4d4d4d}.skip:hover,.exit-full:hover{color:#ddd}.opening .skip{opacity:0;animation:hint .5s ease 2.8s forwards}
  @keyframes hint{to{opacity:1}}
  @media(max-width:600px){.signature{width:94vw}header{padding:0 12px;gap:12px;font-size:9px}footer{padding:14px 12px;gap:8px}footer label{font-size:10px;gap:7px}footer input{width:100px}button{padding:9px 12px}}

  @media(prefers-reduced-motion:reduce){.opening .skip{animation:none;opacity:1}}
</style>
