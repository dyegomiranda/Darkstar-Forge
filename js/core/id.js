/* ==========================================================
   Darkstar Forge — IDs
========================================================== */

var ID = {
    create(prefix = "id") {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
        }
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }
};
