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
function EmployeeApp({ employee, siteCode, history, refreshHistory, refreshAbsences, onLogout }) {
  const [live, setLive] = useState(employee);
  const [screen, setScreen] = useState("accueil");
  const [tab, setTab] = useState("accueil");
  const [enteredCode, setEnteredCode] = useState("");
  const [codeErr, setCodeErr] = useState("");

  const isToday = live.activity_date === todayISO();
  const status = isToday ? live.status : "Absent";
  const arrivee = isToday ? live.arrivee : "--:--";
  const depart = isToday ? live.depart : "--:--";
  const canDepart = arrivee !== "--:--" && depart === "--:--";

  const doScan = async () => {
    if (enteredCode.trim().toUpperCase() !== siteCode.toUpperCase()) { setCodeErr("Code incorrect. Vérifiez le code affiché sur site."); return; }
    const time = nowHM();
    const late = time > "08:00";
    const status2 = late ? "Retard" : "Présent";
    await supabase.rpc("record_arrival", { p_employee_id: live.id, p_time: time, p_status: status2 });
    setLive(l => ({ ...l, status: status2, arrivee: time, depart: "--:--", activity_date: todayISO() }));
    refreshHistory();
    setEnteredCode(""); setCodeErr(""); setScreen("conf-arrivee");
  };
  const doDepart = async () => {
    const time = nowHM();
    await supabase.rpc("record_departure", { p_employee_id: live.id, p_time: time });
    setLive(l => ({ ...l, depart: time }));
    refreshHistory();
    setScreen("conf-depart");
  };
  const sendAbsence = async (d) => {
    await supabase.from("absences").insert({ employee_id: live.id, employee_name: live.name, ...d, status: "En attente" });
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
              <div>
                <div className="text-xs" style={{ color: "#CBDCF3" }}>Bonjour,</div>
                <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 17, color: "#fff" }}>{live.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "#CBDCF3" }}>{live.role}</div>
              </div>
              <button onClick={onLogout}><LogOut size={18} color="#fff" /></button>
            </div>
            <div className="rounded-2xl mt-4 p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div><div className="text-xs" style={{ color: "#CBDCF3" }}>Statut du jour</div><span style={{ color: "#fff", fontFamily: FD, fontWeight: 700, fontSize: 15 }}>{status}</span></div>
              <div className="text-right text-xs" style={{ color: "#CBDCF3" }}><div>Arrivée : {arrivee}</div><div>Départ : {depart}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 mt-5">
            <button onClick={() => setScreen("scanner")} className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <QrCode size={18} color={C.blue} /><span className="text-xs font-semibold">Enregistrer arrivée</span>
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
        </div>
      )}

      {screen === "scanner" && (
        <div className="flex-1 flex flex-col px-6 pt-6">
          <button onClick={() => setScreen("accueil")} className="mb-4 self-start"><ChevronLeft size={20} /></button>
          <div className="text-sm font-semibold mb-1" style={{ fontFamily: FD }}>Code de présence du jour</div>
          <div className="text-xs mb-4" style={{ color: C.muted }}>Saisissez le code affiché par l'administrateur sur le site.</div>
          <Field label="Code de site">
            <input value={enteredCode} onChange={e => { setEnteredCode(e.target.value); setCodeErr(""); }} placeholder="Ex : MB-4F9A" className="w-full px-3.5 py-3 rounded-xl text-sm outline-none uppercase" style={inputStyle} />
          </Field>
          {codeErr && <div className="text-xs mt-2" style={{ color: C.red }}>{codeErr}</div>}
          <div className="mt-4"><Btn icon={QrCode} onClick={doScan}>Valider ma présence</Btn></div>
        </div>
      )}

      {(screen === "conf-arrivee" || screen === "conf-depart") && (
        <div className="flex-1 flex flex-col items-center px-6 pt-10">
          <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 70, height: 70, background: C.greenLight }}><CheckCircle2 size={34} color={C.green} /></div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 15 }}>{screen === "conf-arrivee" ? "Arrivée enregistrée !" : "Départ enregistré !"}</div>
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
          <div className="flex flex-col items-center mb-5"><Avatar name={live.name} size={64} /><div className="text-sm font-semibold mt-2" style={{ fontFamily: FD }}>{live.name}</div></div>
          {[["Profession", live.role], ["Département", live.dept], ["Téléphone", live.phone || "—"], ["Email", live.email || "—"], ["Matricule", live.matricule]].map(([l, v]) => (
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
}function AbsenceForm({ onBack, onSend }) {
  const [date, setDate] = useState(todayISO());
  const [motif, setMotif] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <div className="flex-1 flex flex-col px-6 pt-6">
      <button onClick={onBack} className="mb-4 self-start"><ChevronLeft size={20} /></button>
      <div className="text-sm font-semibold mb-4" style={{ fontFamily: FD }}>Signaler une absence</div>
      <div className="flex flex-col gap-3">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
        <Field label="Motif">
          <select value={motif} onChange={e => setMotif(e.target.value)} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
            <option value="">Sélectionner un motif</option>{MOTIFS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Explication (optionnel)"><textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none" style={inputStyle} /></Field>
      </div>
      <div className="mt-5"><Btn disabled={!motif} onClick={() => onSend({ date, motif, detail })}>Envoyer la demande</Btn></div>
    </div>
  );
}
// ================= APP RACINE =================
export default function App() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [empUser, setEmpUser] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [history, setHistory] = useState([]);
  const [siteCode, setSiteCode] = useState("MB-INIT");

  const refreshEmployees = async () => setEmployees(await fetchEmployees());
  const refreshAbsences = async () => setAbsences(await fetchAbsences());
  const refreshHistory = async () => setHistory(await fetchHistory());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setAdminSession(data.session);
      await Promise.all([refreshEmployees(), refreshAbsences(), refreshHistory()]);
      setSiteCode(await fetchSiteCode());
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setAdminSession(session));

    const channel = supabase
      .channel("mbp-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, refreshEmployees)
      .on("postgres_changes", { event: "*", schema: "public", table: "absences" }, refreshAbsences)
      .on("postgres_changes", { event: "*", schema: "public", table: "history" }, refreshHistory)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, async () => setSiteCode(await fetchSiteCode()))
      .subscribe();

    return () => { sub.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  if (!ready) {
    return <div className="flex items-center justify-center" style={{ height: 400, color: C.muted, fontFamily: FB }}>Chargement…</div>;
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
            siteCode={siteCode} setSiteCode={setSiteCode}
            onLogout={async () => { await supabase.auth.signOut(); setRole(null); }} />
        )}

        {role === "employee" && !empUser && <EmployeeLogin onLogin={setEmpUser} />}
        {role === "employee" && empUser && (
          <EmployeeApp employee={empUser} siteCode={siteCode} history={history}
            refreshHistory={refreshHistory} refreshAbsences={refreshAbsences}
            onLogout={() => { setEmpUser(null); setRole(null); }} />
        )}
      </div>
    </div>
  );const [initError, setInitError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setAdminSession(data.session);
        await Promise.all([refreshEmployees(), refreshAbsences(), refreshHistory()]);
        setSiteCode(await fetchSiteCode());
      } catch (e) {
        setInitError(String(e && e.message ? e.message : e));
      }
      setReady(true);
    })();
}

