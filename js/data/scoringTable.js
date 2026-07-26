/* ==========================================================
   Tabela de pontuação de mecânicas (editável)
   Inspirada em arquétipos de PF2e / D&D 5e — nomes e efeitos
   originais do projeto (não copia texto oficial).

   score ATK/DEF: 1 ponto por ponto de atributo (configurável)
   Custo sugerido: ceil(scoreTotal / pointsPerCost)
========================================================== */

var ScoringTable = {

    version: 1,

    /** Quantos pontos de score valem 1 de custo de recurso */
    pointsPerCost: 3,

    /** Pontos por ponto de ataque / defesa (criaturas, mercenários, etc.) */
    attackPointValue: 1,
    defensePointValue: 1,

    /**
     * Mecânicas catalogadas.
     * points: contribuição no score
     * tags: filtros por tipo de carta / classe
     * source: inspiração genérica (não texto oficial)
     */
    mechanics: {
        /* --- Combate básico --- */
        damage_1:        { name: "Dano 1", points: 1, tags: ["spell", "action"], desc: "Causa 1 de dano" },
        damage_2:        { name: "Dano 2", points: 2, tags: ["spell", "action"], desc: "Causa 2 de dano" },
        damage_3:        { name: "Dano 3", points: 3, tags: ["spell", "action"], desc: "Causa 3 de dano" },
        damage_4:        { name: "Dano 4", points: 4, tags: ["spell", "action"], desc: "Causa 4 de dano" },
        damage_5:        { name: "Dano 5", points: 5, tags: ["spell", "action"], desc: "Causa 5 de dano" },
        damage_6:        { name: "Dano 6", points: 6, tags: ["spell", "action"], desc: "Causa 6 de dano" },
        aoe_damage:      { name: "Área", points: 2, tags: ["spell"], desc: "Afeta múltiplos alvos" },
        pierce:          { name: "Perfurante", points: 1, tags: ["action", "weapon"], desc: "Ignora 1 de defesa" },

        /* --- Keywords estilo criatura --- */
        haste:           { name: "Ímpeto", points: 2, tags: ["creature"], desc: "Pode atacar no turno em que entra" },
        flying:          { name: "Voo", points: 2, tags: ["creature"], desc: "Só bloqueado por voo/alcance" },
        reach:           { name: "Alcance", points: 1, tags: ["creature"], desc: "Bloqueia voo" },
        trample:         { name: "Atropelar", points: 2, tags: ["creature"], desc: "Excesso de dano passa ao jogador" },
        first_strike:    { name: "Iniciativa", points: 1, tags: ["creature"], desc: "Fere antes no combate" },
        vigilance:       { name: "Vigilância", points: 1, tags: ["creature"], desc: "Ataca sem 'virar'" },
        regenerate_1:    { name: "Regenerar 1", points: 2, tags: ["creature"], desc: "Recupera 1 DEF por turno" },
        deathtouch:      { name: "Toque mortal", points: 3, tags: ["creature"], desc: "Qualquer dano destrói" },
        lifelink:        { name: "Vampirismo", points: 2, tags: ["creature"], desc: "Dano cura o controlador" },

        /* --- Recursos / economia --- */
        draw_1:          { name: "Comprar 1", points: 2, tags: ["action", "spell"], desc: "Compre 1 carta" },
        draw_2:          { name: "Comprar 2", points: 4, tags: ["action", "spell"], desc: "Compre 2 cartas" },
        gain_resource_1: { name: "+1 Recurso", points: 2, tags: ["action"], desc: "Ganha 1 do recurso da classe" },
        gain_resource_2: { name: "+2 Recurso", points: 4, tags: ["action"], desc: "Ganha 2 do recurso da classe" },
        gain_fury_1:     { name: "+1 Fúria", points: 1, tags: ["warrior"], desc: "Gera 1 Fúria" },
        gain_fury_2:     { name: "+2 Fúria", points: 2, tags: ["warrior"], desc: "Gera 2 Fúria" },
        spend_fury:      { name: "Gastar Fúria", points: 1, tags: ["warrior"], desc: "Efeito escala com Fúria gasta" },
        hire_gold:       { name: "Contratar (Ouro)", points: 0, tags: ["mercenary"], desc: "Custo em Ouro em vez de vigor" },
        gold_value_1:    { name: "Vale 1 Ouro", points: 1, tags: ["resource"], desc: "Produz/concede 1 ouro" },
        gold_value_2:    { name: "Vale 2 Ouro", points: 2, tags: ["resource"], desc: "Produz/concede 2 ouro" },
        gold_value_3:    { name: "Vale 3 Ouro", points: 3, tags: ["resource"], desc: "Produz/concede 3 ouro" },

        /* --- Guerreiro / Bárbaro (inspiração: investida, escudo, fúria) --- */
        charge:          { name: "Investida", points: 2, tags: ["warrior", "action"], desc: "Bônus ao atacar após mover" },
        power_attack:    { name: "Golpe poderoso", points: 2, tags: ["warrior", "action"], desc: "Troca precisão por dano extra" },
        shield_block:    { name: "Bloqueio de escudo", points: 2, tags: ["warrior", "action"], desc: "Previne dano" },
        second_wind:     { name: "Segundo fôlego", points: 2, tags: ["warrior", "action"], desc: "Cura o jogador" },
        taunt:           { name: "Provocar", points: 1, tags: ["warrior"], desc: "Força bloqueio/ataque em você" },
        weapon_mastery:  { name: "Maestria de arma", points: 2, tags: ["warrior", "equipment"], desc: "Bônus permanente com arma" },
        rage_aura:       { name: "Aura de fúria", points: 3, tags: ["warrior"], desc: "Aliados melee ganham bônus" },

        /* --- Mago / Feiticeiro --- */
        counterspell:    { name: "Contraste", points: 3, tags: ["mage", "spell"], desc: "Anula magia" },
        summon:          { name: "Invocação", points: 2, tags: ["mage", "spell"], desc: "Coloca criatura em jogo" },
        control:         { name: "Controle", points: 2, tags: ["mage", "spell"], desc: "Imobiliza/atordoa alvo" },
        scry_2:          { name: "Visão 2", points: 1, tags: ["mage", "spell"], desc: "Olha 2 do topo do deck" },
        burn:            { name: "Queimadura", points: 1, tags: ["mage", "spell"], desc: "Dano persistente leve" },
        arcane_armor:    { name: "Armadura arcana", points: 2, tags: ["mage", "spell"], desc: "+DEF temporária" },

        /* --- Druida / Guardião --- */
        heal_2:          { name: "Cura 2", points: 2, tags: ["druid", "cleric", "spell"], desc: "Cura 2 PV" },
        heal_4:          { name: "Cura 4", points: 4, tags: ["druid", "cleric", "spell"], desc: "Cura 4 PV" },
        entangle:        { name: "Enredar", points: 2, tags: ["druid", "spell"], desc: "Atrasa criaturas" },
        beast_form:      { name: "Forma bestial", points: 3, tags: ["druid"], desc: "Transforma com novos ATK/DEF" },
        companion:       { name: "Companheiro", points: 2, tags: ["druid", "ranger"], desc: "Invoca aliado animal" },

        /* --- Necromante / Bruxo --- */
        sacrifice:       { name: "Sacrifício", points: 1, tags: ["necro"], desc: "Sacrifica criatura por efeito" },
        reanimate:       { name: "Reanimar", points: 3, tags: ["necro", "spell"], desc: "Retorna criatura do cemitério" },
        drain:           { name: "Drenar", points: 2, tags: ["necro", "spell"], desc: "Dano e cura equivalentes" },
        curse:           { name: "Maldição", points: 2, tags: ["necro", "warlock", "spell"], desc: "Penalidade persistente" },
        soul_harvest:    { name: "Colheita de almas", points: 2, tags: ["necro"], desc: "Ganha Almas ao matar" },

        /* --- Ladino --- */
        sneak:           { name: "Ataque furtivo", points: 2, tags: ["rogue", "action"], desc: "Dano extra se desmarcado" },
        stealth:         { name: "Furtividade", points: 1, tags: ["rogue"], desc: "Não pode ser bloqueado no 1º ataque" },
        disarm_trap:     { name: "Desarmar", points: 1, tags: ["rogue"], desc: "Remove armadilha/encantamento" },
        poison:          { name: "Veneno", points: 2, tags: ["rogue", "action"], desc: "Dano ao longo de turnos" },
        steal:           { name: "Roubar", points: 3, tags: ["rogue", "action"], desc: "Pega recurso ou carta" },

        /* --- Clérigo / Paladino --- */
        smite:           { name: "Castigo sagrado", points: 3, tags: ["paladin", "action"], desc: "Dano extra sagrado" },
        bless:           { name: "Bênção", points: 2, tags: ["cleric", "spell"], desc: "Buff em aliados" },
        turn_undead:     { name: "Repelir mortos", points: 2, tags: ["cleric", "spell"], desc: "Afeta não-mortos" },
        aura_protection: { name: "Aura protetora", points: 3, tags: ["paladin"], desc: "Reduz dano a aliados" },
        resurrect:       { name: "Reviver", points: 5, tags: ["cleric", "spell"], desc: "Traz de volta criatura destruída" },

        /* --- Monge / Bardo --- */
        stun:            { name: "Atordoar", points: 2, tags: ["monk", "action"], desc: "Alvo não age no próximo turno" },
        flurry:          { name: "Rajada", points: 2, tags: ["monk", "action"], desc: "Dois ataques fracos" },
        inspire:         { name: "Inspirar", points: 2, tags: ["bard", "action"], desc: "Buff de ATK a aliados" },
        song_control:    { name: "Canção de controle", points: 2, tags: ["bard", "spell"], desc: "Controla emoção/ação" },
        ki_strike:       { name: "Golpe de ki", points: 2, tags: ["monk", "action"], desc: "Dano mágico corpo-a-corpo" },

        /* --- Equipamentos --- */
        equip_slot_weapon:  { name: "Arma", points: 0, tags: ["equipment"], desc: "Ocupa slot de arma" },
        equip_slot_armor:   { name: "Armadura", points: 0, tags: ["equipment"], desc: "Ocupa slot de armadura" },
        equip_slot_helm:    { name: "Elmo", points: 0, tags: ["equipment"], desc: "Ocupa slot de cabeça" },
        equip_slot_accessory:{ name: "Acessório", points: 0, tags: ["equipment"], desc: "Ocupa slot de acessório" },
        permanent_buff_1:   { name: "Bônus permanente +1", points: 2, tags: ["equipment"], desc: "+1 em um atributo" },
        permanent_buff_2:   { name: "Bônus permanente +2", points: 4, tags: ["equipment"], desc: "+2 em um atributo" },
        equip_mitigate:     { name: "Mitigação", points: 2, tags: ["equipment"], desc: "Reduz dano recebido" },
        equip_penalty:      { name: "Penalidade", points: -1, tags: ["equipment"], desc: "Trade-off (ex.: lentidão)" }
    },

    list() {
        return Object.entries(this.mechanics).map(([id, m]) => ({ id, ...m }));
    },

    get(id) {
        return this.mechanics[id] || null;
    }
};
