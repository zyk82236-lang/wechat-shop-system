"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowIso = nowIso;
exports.genId = genId;
exports.genOrderNo = genOrderNo;
function nowIso() {
    return new Date().toISOString();
}
function genId(prefix) {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now()}_${random}`;
}
function genOrderNo() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const rand = Math.floor(Math.random() * 899999 + 100000);
    return `${stamp}${rand}`;
}
//# sourceMappingURL=id.js.map