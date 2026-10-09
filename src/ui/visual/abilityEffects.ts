export type EffectKind = 'fire'|'ice'|'light'|'shadow'|'nature'|'arcane'|'steel'|'arrow';
export interface AbilityEffect { kind: EffectKind; seed: number; from: {x:number;y:number}; to: {x:number;y:number}; power: number }
export const EFFECT_EVENT='voidsun:ability-effect';
/** Stable art direction per ability. This registry can receive individually authored profiles. */
export function abilityProfile(id:string,name:string,via:string):{kind:EffectKind;seed:number}{
 let seed=0;for(const ch of id)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
 const text=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const kind:EffectKind=via==='melee'?'steel':via==='ranged'?'arrow':/fogo|chama|incendi|meteoro|inferno/.test(text)?'fire':/gelo|gelid|neve|frio|congela/.test(text)?'ice':/cura|sagrad|luz|divin|bencao|radiante|punicao/.test(text)?'light':/sombra|treva|necrom|maldicao|vampir|alma|morte|ruina/.test(text)?'shadow':/natureza|vinha|raiz|espinho|veneno|floresta/.test(text)?'nature':'arcane';
 return {kind,seed};
}
export function emitAbility(profile:{kind:EffectKind;seed:number},from:DOMRect|undefined,to:DOMRect|undefined,power=1){
 if(!to)return;
 const center=(r:DOMRect)=>({x:r.left+r.width/2,y:r.top+r.height*.45});
 window.dispatchEvent(new CustomEvent<AbilityEffect>(EFFECT_EVENT,{detail:{...profile,from:center(from??to),to:center(to),power}}));
}
