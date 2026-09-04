import React, { useState, useEffect, useMemo } from "react";
import {
  QrCode, LogIn, ChevronLeft, Home, History, User, Calendar,
  CheckCircle2, LogOut, Users, CalendarX, Plus, Trash2, Check, X, Shield, MapPin, Camera, Paperclip, Clock, FileBarChart, PieChart as PieIcon, Download,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "./supabaseClient";
import { C, FD, FB, DEPARTMENTS, MOTIFS, todayISO, nowHM } from "./theme";

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
function Avatar({ name, size = 36, photoUrl }) {
  const initials = (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="rounded-full shrink-0" style={{ width: size, height: size, objectFit: "cover" }} />;
  }
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
}

// ---------- Accès aux données (Supabase) ----------
async function fetchEmployees() {
  const { data, error } = await supabase.from("employees_public").select("*").order("created_at");
  if (error) { console.error(error); return []; }
  return data;
}
async function fetchAbsences() {
  const { data, error } = await supabase.from("absences").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
async function fetchHistory() {
  const { data, error } = await supabase.from("history").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
async function fetchSites() {
  const { data, error } = await supabase.from("sites").select("*").order("name");
  if (error) { console.error(error); return []; }
  return data;
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error("Vous devez autoriser l'accès à la localisation pour badger."));
        else if (err.code === 2) reject(new Error("Position introuvable. Vérifiez que le GPS est activé."));
        else reject(new Error("Impossible d'obtenir votre position. Réessayez."));
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

// ---------- Calculs pour Rapport & Statistiques ----------
function parseHistoryEntries(history) {
  return history.map(h => {
    const m = h.detail && h.detail.match(/(Arrivée|Départ) à (\d{2}:\d{2})/);
    if (!m) return null;
    return { employee_id: h.employee_id, date: h.date, type: m[1] === "Arrivée" ? "arrivee" : "depart", time: m[2], status: h.status };
  }).filter(Boolean);
}

function computeReport(history, absences, employees, from, to) {
  const entries = parseHistoryEntries(history).filter(e => (!from || e.date >= from) && (!to || e.date <= to));
  const byKey = {};
  entries.forEach(e => {
    const key = e.employee_id + "|" + e.date;
    byKey[key] = byKey[key] || {};
    byKey[key][e.type] = e.time;
    if (e.type === "arrivee") byKey[key].status = e.status;
  });

  const perEmp = {};
  Object.entries(byKey).forEach(([key, v]) => {
    const empId = key.split("|")[0];
    perEmp[empId] = perEmp[empId] || { present: 0, retard: 0, minutes: 0 };
    if (v.status === "Présent") perEmp[empId].present++;
    if (v.status === "Retard") { perEmp[empId].present++; perEmp[empId].retard++; }
    if (v.arrivee && v.depart) {
      const [ah, am] = v.arrivee.split(":").map(Number);
      const [dh, dm] = v.depart.split(":").map(Number);
      const diff = (dh * 60 + dm) - (ah * 60 + am);
      if (diff > 0) perEmp[empId].minutes += diff;
    }
  });

  const absByEmp = {};
  absences.filter(a => a.status === "Approuvée" && (!from || a.date >= from) && (!to || a.date <= to)).forEach(a => {
    absByEmp[a.employee_id] = (absByEmp[a.employee_id] || 0) + 1;
  });

  const rows = employees.map(e => {
    const p = perEmp[e.id] || { present: 0, retard: 0, minutes: 0 };
    const abs = absByEmp[e.id] || 0;
    const h = Math.floor(p.minutes / 60), m = p.minutes % 60;
    return { id: e.id, name: e.name, present: p.present, retard: p.retard, absent: abs, heures: `${h}h${String(m).padStart(2, "0")}`, minutes: p.minutes };
  });

  const totals = rows.reduce((acc, r) => ({
    present: acc.present + r.present, retard: acc.retard + r.retard, absent: acc.absent + r.absent, minutes: acc.minutes + r.minutes,
  }), { present: 0, retard: 0, absent: 0, minutes: 0 });

  const perDay = {};
  Object.entries(byKey).forEach(([key, v]) => {
    const date = key.split("|")[1];
    if (v.status === "Présent" || v.status === "Retard") perDay[date] = (perDay[date] || 0) + 1;
  });
  const dayData = Object.entries(perDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({
    date: date.slice(5).split("-").reverse().join("/"), count,
  }));

  return { rows, totals, dayData };
}

function downloadCSV(rows, totals) {
  let csv = "Employé;Présences;Retards;Absences;Heures travaillées\n";
  rows.forEach(r => { csv += `${r.name};${r.present};${r.retard};${r.absent};${r.heures}\n`; });
  const th = Math.floor(totals.minutes / 60), tm = totals.minutes % 60;
  csv += `TOTAL;${totals.present};${totals.retard};${totals.absent};${th}h${String(tm).padStart(2, "0")}\n`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `rapport-mb-presence-${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

function AdminAddModal({ onClose, onSave, sites, saving }) {
  const [f, setF] = useState({ matricule: "", pin: "", name: "", role: "", dept: DEPARTMENTS[0], phone: "", email: "", site_id: sites[0]?.id || "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const ok = f.matricule.trim() && f.pin.trim().length === 4 && f.name.trim() && f.role.trim() && f.site_id;

  const onPickPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(11,31,58,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: C.card }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 16 }}>Ajouter un employé</div>
          <button onClick={onClose}><X size={16} color={C.muted} /></button>
        </div>

        <div className="flex flex-col items-center mb-4">
          <label className="relative cursor-pointer">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="rounded-full" style={{ width: 84, height: 84, objectFit: "cover" }} />
            ) : (
              <div className="rounded-full flex items-center justify-center" style={{ width: 84, height: 84, background: C.blueLight }}>
                <Camera size={26} color={C.blue} />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center" style={{ width: 26, height: 26, background: C.gold }}>
              <Camera size={13} color={C.navy} />
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={onPickPhoto} className="hidden" />
          </label>
          <div className="text-xs mt-2" style={{ color: C.muted }}>Photo de l'employé</div>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Matricule (unique)"><input value={f.matricule} onChange={set("matricule")} placeholder="Ex : MB1001" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Code PIN (4 chiffres, à transmettre à l'employé)"><input value={f.pin} onChange={set("pin")} placeholder="Ex : 4821" maxLength={4} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Nom et prénom"><input value={f.name} onChange={set("name")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Fonction"><input value={f.role} onChange={set("role")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Agence">
            <select value={f.site_id} onChange={set("site_id")} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              {sites.length === 0 && <option value="">Aucune agence disponible</option>}
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
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
          <Btn disabled={!ok || saving} onClick={() => ok && onSave(f, photoFile)}>{saving ? "Enregistrement..." : "Ajouter"}</Btn>
        </div>
      </div>
    </div>
  );
}

function AdminApp({ employees, refreshEmployees, absences, refreshAbsences, sites, history, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const present = employees.filter(e => e.status === "Présent").length;
  const absent = employees.filter(e => e.status === "Absent").length;
  const retard = employees.filter(e => e.status === "Retard").length;

  const addEmployee = async (f, photoFile) => {
    setSaving(true);
    let photoUrl = null;
    if (photoFile) {
      const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${f.matricule.trim()}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("employee-photos").upload(path, photoFile, { upsert: true });
      if (upErr) { alert("Erreur photo : " + upErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("employee-photos").getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }
    const { error } = await supabase.rpc("create_employee", {
      p_matricule: f.matricule.trim(), p_pin: f.pin.trim(), p_name: f.name.trim(),
      p_role: f.role.trim(), p_dept: f.dept, p_phone: f.phone.trim(), p_email: f.email.trim(),
      p_site_id: f.site_id, p_photo_url: photoUrl,
    });
    setSaving(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setShowAdd(false);
    refreshEmployees();
  };
  const deleteEmployee = async (id) => {
    if (!confirm("Supprimer cette fiche ?")) return;
    await supabase.from("employees").delete().eq("id", id);
    refreshEmployees();
  };
  const updateAbsence = async (id, status) => {
    await supabase.from("absences").update({ status }).eq("id", id);
    refreshAbsences();
  };

  const nav = [
    { key: "dashboard", label: "Tableau de bord", icon: Home },
    { key: "personnel", label: "Personnel", icon: Users },
    { key: "absences", label: "Absences", icon: CalendarX },
    { key: "rapport", label: "Rapport", icon: FileBarChart },
    { key: "stats", label: "Statistiques", icon: PieIcon },
    { key: "agences", label: "Agences", icon: MapPin },
  ];

  const recentActivity = history.slice(0, 6).map(h => {
    const emp = employees.find(e => e.id === h.employee_id);
    return { ...h, empName: emp?.name || "Employé", empPhoto: emp?.photo_url };
  });

  const report = useMemo(() => computeReport(history, absences, employees, dateFrom, dateTo), [history, absences, employees, dateFrom, dateTo]);
  const pieData = [
    { name: "Présents", value: report.totals.present - report.totals.retard, color: C.green },
    { name: "Retards", value: report.totals.retard, color: C.amber },
    { name: "Absences", value: report.totals.absent, color: C.red },
  ];
  const totalHeures = `${Math.floor(report.totals.minutes / 60)}h${String(report.totals.minutes % 60).padStart(2, "0")}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ background: C.navy }}>
        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: "#fff" }}>Admin MB PRESENCE</span>
        <button onClick={onLogout}><LogOut size={17} color="#B9C6DE" /></button>
      </div>
      <div className="flex overflow-x-auto gap-2 px-3 py-2 shrink-0" style={{ background: C.navy }}>
        {nav.map(n => (
          <button key={n.key} onClick={() => setTab(n.key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap"
            style={{ background: tab === n.key ? "rgba(232,163,61,0.16)" : "transparent", color: tab === n.key ? C.gold : "#B9C6DE" }}>
            <n.icon size={13} /> {n.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "dashboard" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Card style={{ padding: 16 }}><div className="text-2xl font-bold" style={{ fontFamily: FD }}>{employees.length}</div><div className="text-xs" style={{ color: C.muted }}>Personnel total</div></Card>
              <Card style={{ padding: 16 }}><div className="text-2xl font-bold" style={{ color: C.green, fontFamily: FD }}>{present}</div><div className="text-xs" style={{ color: C.muted }}>Présents</div></Card>
              <Card style={{ padding: 16 }}><div className="text-2xl font-bold" style={{ color: C.red, fontFamily: FD }}>{absent}</div><div className="text-xs" style={{ color: C.muted }}>Absents</div></Card>
              <Card style={{ padding: 16 }}><div className="text-2xl font-bold" style={{ color: C.amber, fontFamily: FD }}>{retard}</div><div className="text-xs" style={{ color: C.muted }}>Retards</div></Card>
            </div>
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Aperçu des présences aujourd'hui</div>
              {employees.length === 0 ? <Empty icon={Users} title="Aucun employé" sub="Ajoutez votre personnel dans l'onglet Personnel." /> :
                <div className="flex flex-col gap-2">
                  {employees.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-2"><Avatar name={e.name} size={28} photoUrl={e.photo_url} /><div><span className="text-sm font-medium block">{e.name}</span><span className="text-xs" style={{ color: C.muted }}>{e.site_name || "—"}</span></div></div>
                      <StatusPill status={e.activity_date === todayISO() ? e.status : "Absent"} />
                    </div>
                  ))}
                </div>}
            </Card>
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Dernières activités</div>
              {recentActivity.length === 0 ? <Empty icon={Clock} title="Aucune activité récente" sub="Les arrivées et départs apparaîtront ici." /> :
                <div className="flex flex-col gap-2">
                  {recentActivity.map((h, i) => (
                    <div key={h.id || i} className="flex items-center gap-3 py-2" style={{ borderTop: `1px solid ${C.border}` }}>
                      <Avatar name={h.empName} size={30} photoUrl={h.empPhoto} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{h.empName}</div>
                        <div className="text-xs" style={{ color: C.muted }}>{h.detail}</div>
                      </div>
                      <StatusPill status={h.status} />
                    </div>
                  ))}
                </div>}
            </Card>
          </div>
        )}

        {tab === "personnel" && (
          <div className="flex flex-col gap-3">
            <Btn icon={Plus} onClick={() => setShowAdd(true)}>Ajouter un employé</Btn>
            {employees.length === 0 ? <Empty icon={Users} title="Aucun employé enregistré" sub="Ajoutez les vraies fiches de votre personnel." /> :
              employees.map(e => (
                <Card key={e.id} style={{ padding: 14 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><Avatar name={e.name} photoUrl={e.photo_url} /><div><div className="text-sm font-medium">{e.name}</div><div className="text-xs" style={{ color: C.muted }}>{e.role} · {e.dept}</div></div></div>
                    <button onClick={() => deleteEmployee(e.id)} className="p-1.5 rounded-lg" style={{ background: C.redLight }}><Trash2 size={14} color={C.red} /></button>
                  </div>
                  <div className="text-xs mt-2 flex items-center gap-1" style={{ color: C.muted }}><MapPin size={11} /> {e.site_name || "Aucune agence"} · Matricule : {e.matricule}</div>
                </Card>
              ))}
          </div>
        )}

        {tab === "absences" && (
          <div className="flex flex-col gap-3">
            {absences.length === 0 ? <Empty icon={CalendarX} title="Aucune demande d'absence" sub="Les signalements envoyés par les employés apparaîtront ici." /> :
              absences.map(a => (
                <Card key={a.id} style={{ padding: 14 }}>
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">{a.employee_name}</div><div className="text-xs" style={{ color: C.muted }}>{a.date} · {a.motif}{a.detail ? ` — ${a.detail}` : ""}</div>
                      {a.proof_url && <a href={a.proof_url} target="_blank" rel="noreferrer" className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: C.blue }}><Paperclip size={11} /> Pièce justificative</a>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={a.status} />
                      {a.status === "En attente" && <>
                        <button onClick={() => updateAbsence(a.id, "Approuvée")} className="p-1.5 rounded-lg" style={{ background: C.greenLight }}><Check size={14} color={C.green} /></button>
                        <button onClick={() => updateAbsence(a.id, "Refusée")} className="p-1.5 rounded-lg" style={{ background: C.redLight }}><X size={14} color={C.red} /></button>
                      </>}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {tab === "rapport" && (
          <div className="flex flex-col gap-3">
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Période</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs"><span style={{ color: C.muted }}>Du</span><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} /></div>
                <div className="flex items-center gap-1.5 text-xs"><span style={{ color: C.muted }}>Au</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} /></div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card style={{ padding: 16 }}><div className="text-xl font-bold" style={{ color: C.green, fontFamily: FD }}>{report.totals.present - report.totals.retard}</div><div className="text-xs" style={{ color: C.muted }}>Présences</div></Card>
              <Card style={{ padding: 16 }}><div className="text-xl font-bold" style={{ color: C.blue, fontFamily: FD }}>{totalHeures}</div><div className="text-xs" style={{ color: C.muted }}>Heures travaillées</div></Card>
              <Card style={{ padding: 16 }}><div className="text-xl font-bold" style={{ color: C.red, fontFamily: FD }}>{report.totals.absent}</div><div className="text-xs" style={{ color: C.muted }}>Absences</div></Card>
              <Card style={{ padding: 16 }}><div className="text-xl font-bold" style={{ color: C.amber, fontFamily: FD }}>{report.totals.retard}</div><div className="text-xs" style={{ color: C.muted }}>Retards</div></Card>
            </div>
            <Btn icon={Download} variant="ghost" onClick={() => downloadCSV(report.rows, report.totals)}>Exporter en CSV</Btn>
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Détail par employé</div>
              {report.rows.length === 0 ? <Empty icon={FileBarChart} title="Aucune donnée" sub="Aucune activité sur cette période." /> :
                <div className="flex flex-col gap-2">
                  {report.rows.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 text-xs" style={{ borderTop: `1px solid ${C.border}` }}>
                      <span className="font-medium" style={{ color: C.text }}>{r.name}</span>
                      <span style={{ color: C.muted }}>{r.present}p · {r.retard}r · {r.absent}a · {r.heures}</span>
                    </div>
                  ))}
                </div>}
            </Card>
          </div>
        )}

        {tab === "stats" && (
          <div className="flex flex-col gap-3">
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Répartition des présences</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: FD }}>Présences par jour</div>
              {report.dayData.length === 0 ? <Empty icon={PieIcon} title="Pas encore de données" sub="Les présences par jour apparaîtront ici." /> :
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.dayData}>
                    <CartesianGrid stroke={C.border} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Présences" fill={C.blue} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
            </Card>
          </div>
        )}

        {tab === "agences" && (
          <div className="flex flex-col gap-3">
            <Card style={{ padding: 16 }}>
              <div className="text-sm font-semibold mb-1" style={{ fontFamily: FD }}>Agences enregistrées</div>
              <div className="text-xs mb-3" style={{ color: C.muted }}>La présence de chaque employé est vérifiée par sa position GPS au moment du badgeage.</div>
              {sites.length === 0 ? <div className="text-xs" style={{ color: C.muted }}>Aucune agence configurée.</div> :
                sites.map(s => (
                  <div key={s.id} className="flex items-center gap-2 py-1.5 text-xs" style={{ color: C.text }}>
                    <MapPin size={12} color={C.blue} /> {s.name} <span style={{ color: C.muted }}>(rayon {s.radius_meters} m)</span>
                  </div>
                ))}
            </Card>
          </div>
        )}
      </div>
      {showAdd && <AdminAddModal onClose={() => setShowAdd(false)} onSave={addEmployee} sites={sites} saving={saving} />}
    </div>
  );
}

// ================= EMPLOYÉ =================
function EmployeeLogin({ onLogin }) {
  const [matricule, setMatricule] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = async () => {
    setLoading(true); setErr("");
    const { data, error } = await supabase.rpc("verify_employee_login", { p_matricule: matricule.trim(), p_pin: pin.trim() });
    setLoading(false);
    if (error || !data || data.length === 0) { setErr("Matricule ou code PIN incorrect."); return; }
    onLogin(data[0]);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6">
      <div className="flex flex-col items-center mb-6">
        <div className="rounded-2xl flex items-center justify-center font-extrabold mb-3" style={{ width: 56, height: 56, background: C.gold, color: C.navy, fontFamily: FD, fontSize: 20 }}>MB</div>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 17 }}>MB PRESENCE</div>
        <div className="text-xs mt-1" style={{ color: C.muted }}>Connexion employé</div>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Matricule"><input value={matricule} onChange={e => { setMatricule(e.target.value); setErr(""); }} placeholder="Ex : MB1001" className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
        <Field label="Code PIN"><input value={pin} onChange={e => { setPin(e.target.value); setErr(""); }} placeholder="4 chiffres" className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
      </div>
      {err && <div className="text-xs mt-2" style={{ color: C.red }}>{err}</div>}
      <div className="mt-4"><Btn disabled={loading} icon={LogIn} onClick={tryLogin}>{loading ? "Connexion..." : "Se connecter"}</Btn></div>
      <div className="text-center text-xs mt-6" style={{ color: C.muted }}>Matricule et PIN sont remis par l'administrateur.</div>
    </div>
  );
}

function ConfirmRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span style={{ color: C.muted }}>{label}</span>
      <span className="font-semibold" style={{ color: C.text }}>{value}</span>
    </div>
  );
}

function EmployeeApp({ employee, history, refreshHistory, refreshAbsences, onLogout }) {
  const [live, setLive] = useState(employee);
  const [screen, setScreen] = useState("accueil");
  const [tab, setTab] = useState("accueil");
  const [busy, setBusy] = useState(false);
  const [arrivalErr, setArrivalErr] = useState("");

  const isToday = live.activity_date === todayISO();
  const status = isToday ? live.status : "Absent";
  const arrivee = isToday ? live.arrivee : "--:--";
  const depart = isToday ? live.depart : "--:--";
  const canDepart = arrivee !== "--:--" && depart === "--:--";
  const todayStr = new Date().toLocaleDateString("fr-FR");

  const doArrival = async () => {
    setBusy(true);
    setArrivalErr("");
    try {
      const { lat, lng } = await getLocation();
      const time = nowHM();
      const late = time > "08:00";
      const status2 = late ? "Retard" : "Présent";
      const { error } = await supabase.rpc("record_arrival", {
        p_employee_id: live.id, p_time: time, p_status: status2, p_lat: lat, p_lng: lng,
      });
      if (error) throw error;
      setLive(l => ({ ...l, status: status2, arrivee: time, depart: "--:--", activity_date: todayISO() }));
      refreshHistory();
      setScreen("conf-arrivee");
    } catch (e) {
      setArrivalErr(e.message || "Impossible de valider la présence.");
    } finally {
      setBusy(false);
    }
  };
  const doDepart = async () => {
    const time = nowHM();
    await supabase.rpc("record_departure", { p_employee_id: live.id, p_time: time });
    setLive(l => ({ ...l, depart: time }));
    refreshHistory();
    setScreen("conf-depart");
  };
  const sendAbsence = async (d, proofFile) => {
    let proofUrl = null;
    if (proofFile) {
      const ext = (proofFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${live.matricule}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("absence-proofs").upload(path, proofFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("absence-proofs").getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }
    }
    await supabase.from("absences").insert({ employee_id: live.id, employee_name: live.name, ...d, proof_url: proofUrl, status: "En attente" });
    refreshAbsences();
    setScreen("accueil");
  };

  const myHistory = history.filter(h => h.employee_id === live.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {screen === "accueil" && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-6" style={{ background: C.blue, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={live.name} size={44} photoUrl={live.photo_url} />
                <div>
                  <div className="text-xs" style={{ color: "#CBDCF3" }}>Bonjour,</div>
                  <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: "#fff" }}>{live.name}</div>
                  <div className="text-xs" style={{ color: "#CBDCF3" }}>{live.role}{live.site_name ? ` · ${live.site_name}` : ""}</div>
                </div>
              </div>
              <button onClick={onLogout}><LogOut size={18} color="#fff" /></button>
            </div>
            <div className="rounded-2xl mt-4 p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div><div className="text-xs" style={{ color: "#CBDCF3" }}>Statut du jour</div><span style={{ color: "#fff", fontFamily: FD, fontWeight: 700, fontSize: 15 }}>{status}</span></div>
              <div className="text-right text-xs" style={{ color: "#CBDCF3" }}><div>Arrivée : {arrivee}</div><div>Départ : {depart}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 mt-5">
            <button disabled={busy} onClick={doArrival} className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left" style={{ background: C.card, border: `1px solid ${C.border}`, opacity: busy ? 0.6 : 1 }}>
              <MapPin size={18} color={C.blue} /><span className="text-xs font-semibold">{busy ? "Vérification..." : "Enregistrer arrivée"}</span>
            </button>
            <button disabled={!canDepart} onClick={doDepart} className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left" style={{ background: C.card, border: `1px solid ${C.border}`, opacity: canDepart ? 1 : 0.4 }}>
              <LogOut size={18} color={C.green} /><span className="text-xs font-semibold">Enregistrer départ</span>
            </button>
            <button onClick={() => setScreen("absence")} className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <Calendar size={18} color={C.amber} /><span className="text-xs font-semibold">Signaler une absence</span>
            </button>
            <button onClick={() => setScreen("historique")} className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <History size={18} color={C.navy} /><span className="text-xs font-semibold">Mon historique</span>
            </button>
          </div>
          {arrivalErr && <div className="text-xs mt-3 mx-5 p-3 rounded-xl" style={{ background: C.redLight, color: C.red }}>{arrivalErr}</div>}
        </div>
      )}

      {(screen === "conf-arrivee" || screen === "conf-depart") && (
        <div className="flex-1 flex flex-col items-center px-6 pt-8 overflow-y-auto">
          <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 64, height: 64, background: C.greenLight }}><CheckCircle2 size={32} color={C.green} /></div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 15, textAlign: "center" }}>{screen === "conf-arrivee" ? "Arrivée enregistrée avec succès !" : "Départ enregistré avec succès !"}</div>

          <div className="w-full rounded-2xl mt-6 p-4" style={{ background: C.bg }}>
            <div className="flex flex-col items-center mb-3">
              <Avatar name={live.name} size={64} photoUrl={live.photo_url} />
            </div>
            <ConfirmRow label="Nom et prénom" value={live.name} />
            <ConfirmRow label="Date" value={todayStr} />
            {screen === "conf-arrivee" ? (
              <ConfirmRow label="Heure d'arrivée" value={live.arrivee} />
            ) : (
              <ConfirmRow label="Heure de départ" value={live.depart} />
            )}
            <ConfirmRow label="Profession" value={live.role} />
            <ConfirmRow label="Agence" value={live.site_name || "—"} />
          </div>

          <div className="w-full mt-6"><Btn onClick={() => setScreen("accueil")}>OK</Btn></div>
        </div>
      )}

      {screen === "absence" && <AbsenceForm onBack={() => setScreen("accueil")} onSend={sendAbsence} />}

      {screen === "historique" && (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <button onClick={() => setScreen("accueil")} className="mb-3"><ChevronLeft size={20} /></button>
          {myHistory.length === 0 ? <Empty icon={History} title="Aucun historique" sub="Vos arrivées et départs apparaîtront ici." /> :
            <div className="flex flex-col gap-2">
              {myHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div><div className="text-sm font-medium">{h.date}</div><div className="text-xs" style={{ color: C.muted }}>{h.detail}</div></div>
                  <StatusPill status={h.status} />
                </div>
              ))}
            </div>}
        </div>
      )}

      {screen === "profil" && (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col items-center mb-5"><Avatar name={live.name} size={84} photoUrl={live.photo_url} /><div className="text-sm font-semibold mt-2" style={{ fontFamily: FD }}>{live.name}</div></div>
          {[["Profession", live.role], ["Agence", live.site_name || "—"], ["Département", live.dept], ["Téléphone", live.phone || "—"], ["Email", live.email || "—"], ["Matricule", live.matricule]].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <span className="text-xs" style={{ color: C.muted }}>{l}</span><span className="text-sm font-medium">{v}</span>
            </div>
          ))}
          <div className="mt-5"><Btn variant="ghost" icon={LogOut} onClick={onLogout}>Se déconnecter</Btn></div>
        </div>
      )}

      {["accueil", "historique", "profil"].includes(screen) && (
        <div className="flex items-center justify-around shrink-0" style={{ height: 60, background: C.card, borderTop: `1px solid ${C.border}` }}>
          {[["accueil", Home, "Accueil"], ["historique", History, "Historique"], ["profil", User, "Profil"]].map(([k, Icon, l]) => (
            <button key={k} onClick={() => { setScreen(k); setTab(k); }} className="flex flex-col items-center gap-1">
              <Icon size={18} color={tab === k ? C.blue : C.muted} />
              <span style={{ fontSize: 10, fontWeight: tab === k ? 700 : 500, color: tab === k ? C.blue : C.muted }}>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AbsenceForm({ onBack, onSend }) {
  const [date, setDate] = useState(todayISO());
  const [motif, setMotif] = useState("");
  const [detail, setDetail] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofName, setProofName] = useState("");
  const [sending, setSending] = useState(false);

  const onPickProof = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofName(file.name);
  };

  const submit = async () => {
    setSending(true);
    await onSend({ date, motif, detail }, proofFile);
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col px-6 pt-6 overflow-y-auto">
      <button onClick={onBack} className="mb-4 self-start"><ChevronLeft size={20} /></button>
      <div className="text-sm font-semibold mb-4" style={{ fontFamily: FD }}>Signaler une absence</div>
      <div className="flex flex-col gap-3">
        <Field label="Date de l'absence"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
        <Field label="Motif de l'absence">
          <select value={motif} onChange={e => setMotif(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
            <option value="">Sélectionner un motif</option>{MOTIFS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Explication (optionnel)"><textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} placeholder="Donnez plus de détails..." className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none" style={inputStyle} /></Field>
        <Field label="Pièce justificative (optionnel)">
          <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium cursor-pointer" style={{ background: C.blueLight, color: C.blue }}>
            <Paperclip size={15} /> {proofName || "Ajouter un fichier"}
            <input type="file" accept="image/*,.pdf" onChange={onPickProof} className="hidden" />
          </label>
        </Field>
      </div>
      <div className="mt-5 mb-4"><Btn disabled={!motif || sending} onClick={submit}>{sending ? "Envoi..." : "Envoyer la demande"}</Btn></div>
    </div>
  );
}

// ================= APP RACINE =================
export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [role, setRole] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [empUser, setEmpUser] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [history, setHistory] = useState([]);
  const [sites, setSites] = useState([]);

  const refreshEmployees = async () => setEmployees(await fetchEmployees());
  const refreshAbsences = async () => setAbsences(await fetchAbsences());
  const refreshHistory = async () => setHistory(await fetchHistory());
  const refreshSites = async () => setSites(await fetchSites());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setAdminSession(data.session);
        await Promise.all([refreshEmployees(), refreshAbsences(), refreshHistory(), refreshSites()]);
      } catch (e) {
        setInitError(String(e && e.message ? e.message : e));
      }
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setAdminSession(session));

    const channel = supabase
      .channel("mbp-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, refreshEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "absences" }, refreshAbsences)
      .on("postgres_changes", { event: "*", schema: "public", table: "history" }, refreshHistory)
      .subscribe();

    return () => { sub.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  if (!ready) {
    return <div className="flex items-center justify-center" style={{ height: 400, color: C.muted, fontFamily: FB }}>Chargement…</div>;
  }
  if (initError) {
    return <div style={{ padding: 24, color: C.red, fontFamily: FB, fontSize: 13 }}>Erreur de connexion : {initError}</div>;
  }

  return (
    <div style={{ fontFamily: FB, background: C.bg }} className="flex justify-center min-h-screen py-6">
      <div className="flex flex-col overflow-hidden" style={{ width: 380, height: 780, borderRadius: 28, border: `8px solid ${C.navy}`, boxShadow: "0 20px 50px rgba(11,31,58,0.25)" }}>
        {!role && (
          <div className="flex-1 flex flex-col justify-center px-8 gap-3" style={{ background: C.bg }}>
            <div className="flex flex-col items-center mb-6">
              <div className="rounded-2xl flex items-center justify-center font-extrabold mb-3" style={{ width: 60, height: 60, background: C.gold, color: C.navy, fontFamily: FD, fontSize: 22 }}>MB</div>
              <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18 }}>MB PRESENCE</div>
              <div className="text-xs mt-1" style={{ color: C.muted }}>Choisissez votre espace</div>
            </div>
            <Btn onClick={() => setRole("employee")} icon={User}>Espace Employé</Btn>
            <Btn variant="ghost" onClick={() => setRole("admin")} icon={Shield}>Espace Administrateur</Btn>
          </div>
        )}

        {role === "admin" && !adminSession && <AdminLogin onLogin={() => {}} />}
        {role === "admin" && adminSession && (
          <AdminApp employees={employees} refreshEmployees={refreshEmployees} absences={absences} refreshAbsences={refreshAbsences}
            sites={sites} history={history}
            onLogout={async () => { await supabase.auth.signOut(); setRole(null); }} />
        )}

        {role === "employee" && !empUser && <EmployeeLogin onLogin={setEmpUser} />}
        {role === "employee" && empUser && (
          <EmployeeApp employee={empUser} history={history}
            refreshHistory={refreshHistory} refreshAbsences={refreshAbsences}
            onLogout={() => { setEmpUser(null); setRole(null); }} />
        )}
      </div>
    </div>
  );
                                                                                }
