/** Versioned anatomy and attachment contract. No image resizing or per-hero coordinates. */
export type BodyId='male-normal'|'female-normal'|'male-strong'|'female-strong';
export type HairId='short'|'braid'|'ponytail';
export type GearId='armor'|'helmet'|'weapon'|'shield'|'boots'|'gloves'|'cape';
export const BODIES:Record<BodyId,{label:string;height:number;shoulder:number;waist:number;chest:number;depth:number;limb:number;head:number}>={
 'male-normal':{label:'Masculino · normal',height:2.30,shoulder:.31,waist:.20,chest:.28,depth:.145,limb:.085,head:.225},
 'female-normal':{label:'Feminino · normal',height:2.30,shoulder:.275,waist:.185,chest:.255,depth:.14,limb:.075,head:.215},
 'male-strong':{label:'Masculino · forte',height:2.46,shoulder:.37,waist:.23,chest:.325,depth:.17,limb:.108,head:.225},
 'female-strong':{label:'Feminino · forte',height:2.46,shoulder:.325,waist:.21,chest:.285,depth:.158,limb:.094,head:.215},
};
export const RIG_VERSION='human-v1';
export const GEAR:Record<GearId,{rig:string;socket:string;covers:string[];clearance:number}>={
 armor:{rig:RIG_VERSION,socket:'chest',covers:['tunic','skin-torso'],clearance:.035},
 helmet:{rig:RIG_VERSION,socket:'head',covers:['hair'],clearance:.037},
 weapon:{rig:RIG_VERSION,socket:'handR',covers:[],clearance:0},
 shield:{rig:RIG_VERSION,socket:'handL',covers:[],clearance:0},
 boots:{rig:RIG_VERSION,socket:'foot',covers:['shoes'],clearance:.032},
 gloves:{rig:RIG_VERSION,socket:'hand',covers:['hands'],clearance:.022},
 cape:{rig:RIG_VERSION,socket:'chest',covers:[],clearance:.07},
};
export function requireGearFit(body:BodyId,item:GearId,rig=RIG_VERSION){if(!BODIES[body]||!GEAR[item]||GEAR[item].rig!==rig)throw new Error(`Peça sem variante compatível: ${body}/${item}/${rig}`);return GEAR[item];}
/** Foot remains stationary in world space during stance, driven by distance traveled, not a global clock. */
export function gaitFoot(cycle:number,side:number,stride=1.08){const p=((cycle+(side>0?.5:0))%1+1)%1;const s=stride/4;
 if(p<.5)return {z:s-4*s*p,y:0,stance:true};
 const t=(p-.5)*2;return {z:-s+2*s*(t*t*(3-2*t)),y:Math.sin(Math.PI*t)*.17,stance:false};}
/** Exact two-link planar leg solution. X rotations use +Z as forward and Y as up. */
export function solveLeg(hip:number,ankle:number,z:number,upper=.46,lower=.48){
 const dy=hip-ankle,d=Math.min(Math.hypot(dy,z),upper+lower-.0001),a=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-a*a));
 const ny=dy/Math.hypot(dy,z),nz=z/Math.hypot(dy,z);const ky=hip-a*ny+h*nz,kz=a*nz+h*ny;
 const thigh=Math.atan2(kz,hip-ky),shin=Math.atan2(z-kz,ky-ankle);
 return {thigh:-thigh,shin:thigh-shin,foot:shin,kneeY:ky,kneeZ:kz};
}
