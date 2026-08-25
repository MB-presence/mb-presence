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
                                              }
