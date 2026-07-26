/* ==========================================================
   Template: Clássico Full Art
   Proporções próximas a MTG (750×1050 @ ~300dpi)
========================================================== */

var ClassicFullArt = {
    id: "classic-fullart",
    name: "Clássico Full Art",
    width: 750,
    height: 1050,

    layout(card) {
        // Altura da caixa de regras: valor do estilo, ou auto (cresce para cima)
        let rulesH = card?.style?.rulesHeight ?? 300;
        if (card?.style?.autoRulesHeight && card?.style?._computedRulesH) {
            rulesH = card.style._computedRulesH;
        }
        rulesH = Math.max(160, Math.min(520, Number(rulesH) || 300));

        // Reserva fixa no rodapé (footer + logo + ATK/DEF) — SEMPRE a mesma,
        // com ou sem caixas de combate.
        const bottomReserve = 78;
        const typeH = 52;
        const rulesBottom = 1050 - bottomReserve;
        const rulesY = rulesBottom - rulesH;
        // sobe a barra de tipo junto com a caixa (crescimento para cima)
        const typeY = rulesY - typeH + 6;
        // não invadir o header (mínimo ~120)
        const minTypeY = 120;
        let finalRulesH = rulesH;
        let finalRulesY = rulesY;
        let finalTypeY = typeY;
        if (typeY < minTypeY) {
            finalTypeY = minTypeY;
            finalRulesY = finalTypeY + typeH - 6;
            finalRulesH = rulesBottom - finalRulesY;
        }

        // Círculos maiores (proporção MTG mana symbol)
        const cy = 62;
        const r = 44;
        const leftCx = 78;
        const rightCx = 750 - 78;

        return {
            header: { x: 78, y: 32, w: 594, h: 60 },
            costCircle: { cx: leftCx, cy, r },
            classCircle: { cx: rightCx, cy, r },
            title: { x: leftCx + r + 10, y: 36, w: rightCx - leftCx - 2 * r - 20, h: 52 },
            typeBar: { x: 46, y: finalTypeY, w: 658, h: typeH },
            rulesBox: { x: 46, y: finalRulesY, w: 658, h: finalRulesH },
            // ATK/DEF sempre na zona reservada inferior
            attack: { x: 518, y: 1050 - bottomReserve + 10, w: 100, h: 56 },
            defense: { x: 628, y: 1050 - bottomReserve + 10, w: 100, h: 56 },
            setSymbol: { cx: 375, cy: 1050 - 30, r: 18 },
            footer: { x: 54, y: 1050 - 38, w: 280, h: 24 },
            bottomReserve
        };
    },

    buildFrameSVG(card, colors) {
        const opacity = card?.style?.panelOpacity ?? 0.72;
        const strokeW = card?.style?.strokeWidth ?? 2.4;
        const glow = card?.style?.glow ?? 8;
        const L = this.layout(card);
        const cols = colors?.length ? colors : ["#b92d20"];
        const stroke = ColorUtils.strokeFor(cols);
        const panelSolid = ColorUtils.panelRGBA(cols[0], opacity);
        const panelFill = cols.length > 1 ? "url(#panelGrad)" : panelSolid;
        const showCombat = !!card?.showCombat;

        const gradDef = cols.length > 1
            ? `<linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                ${cols.map((c, i) => {
                    const p = (i / (cols.length - 1)) * 100;
                    return `<stop offset="${p}%" stop-color="${c}"/>`;
                }).join("")}
               </linearGradient>
               <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                ${cols.map((c, i) => {
                    const p = (i / (cols.length - 1)) * 100;
                    const rgba = ColorUtils.panelRGBA(c, opacity);
                    // extrai rgb do rgba(r,g,b,a)
                    const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    const col = m ? `rgb(${m[1]},${m[2]},${m[3]})` : c;
                    return `<stop offset="${p}%" stop-color="${col}" stop-opacity="${opacity}"/>`;
                }).join("")}
               </linearGradient>`
            : "";

        const hx = L.header.x, hy = L.header.y, hw = L.header.w, hh = L.header.h;
        const headerPath = this._headerPath(hx, hy, hw, hh);
        const tx = L.typeBar.x, ty = L.typeBar.y, tw = L.typeBar.w, th = L.typeBar.h;
        const typePath = this._bannerPath(tx, ty, tw, th, 14);
        const rx = L.rulesBox.x, ry = L.rulesBox.y, rw = L.rulesBox.w, rh = L.rulesBox.h;
        const rulesOuter = this._panelPath(rx, ry, rw, rh, 14);
        const rulesInner = this._panelPath(rx + 8, ry + 8, rw - 16, rh - 16, 10);

        const combat = showCombat
            ? this._statBox(L.attack, panelFill, stroke, strokeW) +
              this._statBox(L.defense, panelFill, stroke, strokeW)
            : "";

        // Glow com gradação real (0 = off; sobe stdDeviation e opacidade)
        const g = Math.max(0, Math.min(30, Number(glow) || 0));
        const filterGlow = g > 0
            ? `<filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
                 <feDropShadow dx="0" dy="0" stdDeviation="${(g * 0.65).toFixed(2)}"
                   flood-color="${cols[0]}" flood-opacity="${Math.min(0.7, 0.12 + g * 0.022).toFixed(3)}"/>
               </filter>`
            : "";

        const ornaments = `
  <path d="M ${rx - 2} ${ry + 20} Q ${rx - 10} ${ry + rh / 2} ${rx - 2} ${ry + rh - 20}"
        fill="none" stroke="${stroke}" stroke-width="${strokeW * 0.7}" opacity="0.7"/>
  <path d="M ${rx + rw + 2} ${ry + 20} Q ${rx + rw + 10} ${ry + rh / 2} ${rx + rw + 2} ${ry + rh - 20}"
        fill="none" stroke="${stroke}" stroke-width="${strokeW * 0.7}" opacity="0.7"/>`;

        const midX = 375, midY = hy + hh / 2 + 2;

        return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050" class="card-frame-svg">
  <defs>
    ${gradDef}
    ${filterGlow}
    <linearGradient id="metalShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
    </linearGradient>
    <filter id="typeDepth" x="-20%" y="-40%" width="140%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g ${g > 0 ? 'filter="url(#softGlow)"' : ""}>
    <path d="${headerPath}" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
    <path d="${headerPath}" fill="url(#metalShine)" stroke="none"/>
    <path d="${this._headerPath(hx + 6, hy + 5, hw - 12, hh - 10)}" fill="none"
          stroke="${stroke}" stroke-width="0.9" opacity="0.4"/>
  </g>
  <path d="M ${midX} ${midY - 5} L ${midX + 5} ${midY} L ${midX} ${midY + 5} L ${midX - 5} ${midY} Z"
        fill="${stroke}" opacity="0.85"/>

  ${this._ring(L.costCircle.cx, L.costCircle.cy, L.costCircle.r, stroke, strokeW)}
  ${this._ring(L.classCircle.cx, L.classCircle.cy, L.classCircle.r, stroke, strokeW)}

  <!-- Regras POR BAIXO do tipo (profundidade) -->
  <path d="${rulesOuter}" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
  <path d="${rulesOuter}" fill="url(#metalShine)" stroke="none"/>
  <path d="${rulesInner}" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.45"/>
  ${ornaments}

  <!-- Tipo À FRENTE das regras, com sombra -->
  <g filter="url(#typeDepth)">
    <path d="${typePath}" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
    <path d="${typePath}" fill="url(#metalShine)" stroke="none"/>
    <path d="${this._bannerPath(tx + 5, ty + 4, tw - 10, th - 8, 10)}" fill="none"
          stroke="${stroke}" stroke-width="0.85" opacity="0.4"/>
  </g>

  <!-- Slot de raridade (sem fill — o ícone fica no HTML) -->
  <g transform="translate(${tx + tw - 36}, ${ty + th / 2})" opacity="0.35">
    <circle r="11" fill="none" stroke="${stroke}" stroke-width="0.8"/>
  </g>

  ${combat}

  <circle cx="${L.setSymbol.cx}" cy="${L.setSymbol.cy}" r="${L.setSymbol.r}"
          fill="#0a0a0a" fill-opacity="0.5" stroke="${stroke}" stroke-width="${strokeW * 0.7}"/>
</svg>`;
    },

    /** SVG ultra-simplificado para miniaturas — apenas <rect> com rx, sem paths complexos */
    buildFrameSVGThumb(card, colors) {
        const opacity = card?.style?.panelOpacity ?? 0.72;
        const strokeW = 1.5;
        const L = this.layout(card);
        const cols = colors?.length ? colors : ["#b92d20"];
        const stroke = ColorUtils.strokeFor(cols);
        const panelSolid = ColorUtils.panelRGBA(cols[0], opacity);
        const panelFill = cols.length > 1 ? "url(#panelGradT)" : panelSolid;
        const showCombat = !!card?.showCombat;

        const gradDef = cols.length > 1
            ? `<linearGradient id="panelGradT" x1="0%" y1="0%" x2="100%" y2="0%">${
                cols.map((c, i) => {
                    const p = (i / (cols.length - 1)) * 100;
                    const rgba = ColorUtils.panelRGBA(c, opacity);
                    const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    const col = m ? `rgb(${m[1]},${m[2]},${m[3]})` : c;
                    return `<stop offset="${p}%" stop-color="${col}" stop-opacity="${opacity}"/>`;
                }).join("")
              }</linearGradient>`
            : "";

        const hx = L.header.x, hy = L.header.y, hw = L.header.w, hh = L.header.h;
        const tx = L.typeBar.x, ty = L.typeBar.y, tw = L.typeBar.w, th = L.typeBar.h;
        const rx = L.rulesBox.x, ry = L.rulesBox.y, rw = L.rulesBox.w, rh = L.rulesBox.h;
        const headerR = hh / 2;
        const panelR = 14;

        const combat = showCombat
            ? `<rect x="${L.attack.x}" y="${L.attack.y}" width="${L.attack.w}" height="${L.attack.h}" rx="8" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
              `<rect x="${L.defense.x}" y="${L.defense.y}" width="${L.defense.w}" height="${L.defense.h}" rx="8" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>`
            : "";

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050" class="card-frame-svg">
  <defs>${gradDef}</defs>
  <rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="${headerR}" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
  <circle cx="${L.costCircle.cx}" cy="${L.costCircle.cy}" r="${L.costCircle.r}" fill="#0a0a0a" stroke="${stroke}" stroke-width="2"/>
  <circle cx="${L.classCircle.cx}" cy="${L.classCircle.cy}" r="${L.classCircle.r}" fill="#0a0a0a" stroke="${stroke}" stroke-width="2"/>
  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${panelR}" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
  <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="8" fill="${panelFill}" stroke="${stroke}" stroke-width="${strokeW}"/>
  <circle cx="${L.setSymbol.cx}" cy="${L.setSymbol.cy}" r="${L.setSymbol.r}" fill="#0a0a0a" fill-opacity="0.5" stroke="${stroke}" stroke-width="1"/>
  ${combat}
</svg>`;
    },

    _ring(cx, cy, r, stroke, strokeW) {
        return `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0a0a" stroke="${stroke}" stroke-width="${strokeW * 1.25}"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="${stroke}" stroke-width="1.1" opacity="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 1.5}" fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.12"/>`;
    },

    _headerPath(x, y, w, h) {
        const r = h / 2;
        return `
          M ${x + r} ${y}
          L ${x + w - r} ${y}
          A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}
          L ${x + r} ${y + h}
          A ${r} ${r} 0 0 1 ${x + r} ${y}
          Z`;
    },

    _bannerPath(x, y, w, h, cut) {
        const c = cut || 12;
        return `
          M ${x + c} ${y}
          L ${x + w - c} ${y}
          L ${x + w} ${y + h / 2}
          L ${x + w - c} ${y + h}
          L ${x + c} ${y + h}
          L ${x} ${y + h / 2}
          Z`;
    },

    _panelPath(x, y, w, h, rad) {
        const r = rad || 12;
        return `
          M ${x + r} ${y}
          L ${x + w - r} ${y}
          Q ${x + w} ${y} ${x + w} ${y + r}
          L ${x + w} ${y + h - r}
          Q ${x + w} ${y + h} ${x + w - r} ${y + h}
          L ${x + r} ${y + h}
          Q ${x} ${y + h} ${x} ${y + h - r}
          L ${x} ${y + r}
          Q ${x} ${y} ${x + r} ${y}
          Z`;
    },

    _statBox(box, fill, stroke, strokeW) {
        const r = 10;
        return `
  <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${r}" ry="${r}"
        fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>
  <rect x="${box.x + 3}" y="${box.y + 3}" width="${box.w - 6}" height="${box.h - 6}" rx="${r - 2}"
        fill="none" stroke="${stroke}" stroke-width="0.9" opacity="0.45"/>`;
    },

    frameColorsFor(card) {
        if (card?.style?.frameColorOverrides?.length) {
            return card.style.frameColorOverrides;
        }
        return Catalog.resolveFrameColors(card?.colorIds);
    }
};

TemplateRegistry.register(ClassicFullArt);
