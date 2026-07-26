/* ==========================================================
   Darkstar Forge — Registry de templates (modular)
========================================================== */

var TemplateRegistry = {
    map: {},

    register(template) {
        if (!template || !template.id) throw new Error("Template inválido");
        this.map[template.id] = template;
    },

    get(id) {
        return this.map[id] || this.map["classic-fullart"] || Object.values(this.map)[0];
    },

    list() {
        return Object.values(this.map);
    }
};
