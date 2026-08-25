import React, { useState, useEffect } from "react";
import {
  QrCode, LogIn, ChevronLeft, Home, History, User, Calendar,
  CheckCircle2, LogOut, Users, CalendarX, Plus, Trash2, Check, X, Shield, RefreshCw,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { C, FD, FB, DEPARTMENTS, MOTIFS, todayISO, nowHM, genSiteCode } from "./theme";

// ---------- UI atoms ----------
function Btn({ children, onClick, disabled, icon: Icon, variant = "primary", style }) {
  const styles = {
    primary: { background: disabled ? "#9FB3D6" : C.blue, color: "#fff" },
    success: { background: disabled ? "#9FB3D6" : C.green, color: "#fff" },
    ghost: { background: C.bg, color: C.text },
  };
  return (
    <button disabled={disabled} onClick={onClick}
      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold"
      style={{ ...styles[variant], ...style }}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}
function Field({ label, children }) {
  return <div><label className="text-xs font-medium" style={{ color: C.muted }}>{label}</label><div className="mt-1">{children}</div></div>;
}
const inputStyle = { background: C.bg, border: `1px solid ${C.border}`, color: C.text };
function StatusPill({ status }) {
  const map = { "Présent": [C.greenLight, C.green], "Retard": [C.amberLight, C.amber], "Absent": [C.redLight, C.red],
    "Approuvée": [C.greenLight, C.green], "Refusée": [C.redLight, C.red], "En attente": [C.amberLight, C.amber] };
  const [bg, fg] = map[status] || ["#EEE", C.muted];
  return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: bg, color: fg }}>{status}</span>;
}
function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  return <div className="rounded-full flex items-center justify-center font-semibold shrink-0"
    style={{ width: size, height: size, background: C.blueLight, color: C.blue, fontSize: size * 0.38, fontFamily: FD }}>{initials}</div>;
}
function Card({ children, style }) {
  return <div className="rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}
function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 46, height: 46, background: C.blueLight }}>
        <Icon size={20} color={C.blue} />
      </div>
      <div className="text-sm font-medium" style={{ color: C.text }}>{title}</div>
      {sub && <div className="text-xs mt-1 max-w-xs" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
 // ================= ADMIN =================
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr("Identifiants incorrects.");
    else onLogin();
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6">
      <div className="flex flex-col items-center mb-6">
        <div className="rounded-2xl flex items-center justify-center font-extrabold mb-3" style={{ width: 56, height: 56, background: C.gold, color: C.navy, fontFamily: FD, fontSize: 20 }}>MB</div>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 17 }}>Site Administrateur</div>
        <div className="text-xs mt-1" style={{ color: C.muted }}>Connexion sécurisée (Supabase Auth)</div>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
        <Field label="Mot de passe"><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
      </div>
      {err && <div className="text-xs mt-2" style={{ color: C.red }}>{err}</div>}
      <div className="mt-4"><Btn disabled={loading} onClick={doLogin}>{loading ? "Connexion..." : "Se connecter"}</Btn></div>
      <div className="text-center text-xs mt-6" style={{ color: C.muted }}>
        Compte créé dans Supabase &gt; Authentication &gt; Users.
      </div>
    </div>
  );
}

function AdminAddModal({ onClose, onSave }) {
  const [f, setF] = useState({ matricule: "", pin: "", name: "", role: "", dept: DEPARTMENTS[0], phone: "", email: "" });
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const ok = f.matricule.trim() && f.pin.trim().length === 4 && f.name.trim() && f.role.trim();
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(11,31,58,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: C.card }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 16 }}>Ajouter un employé</div>
          <button onClick={onClose}><X size={16} color={C.muted} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Matricule (unique)"><input value={f.matricule} onChange={set("matricule")} placeholder="Ex : MB1001" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Code PIN (4 chiffres, à transmettre à l'employé)"><input value={f.pin} onChange={set("pin")} placeholder="Ex : 4821" maxLength={4} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Nom et prénom"><input value={f.name} onChange={set("name")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Fonction"><input value={f.role} onChange={set("role")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Département">
            <select value={f.dept} onChange={set("dept")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Téléphone / WhatsApp"><input value={f.phone} onChange={set("phone")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Email"><input value={f.email} onChange={set("email")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn disabled={!ok} onClick={() => ok && onSave(f)}>Ajouter</Btn>
        </div>
      </div>
    </div>
  );
}                                             }
