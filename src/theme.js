export const C = {
  navy: "#0B1F3A", blue: "#1B4F9C", blueLight: "#EAF1FC",
  gold: "#E8A33D", goldLight: "#FCF1DE",
  green: "#1D9A6C", greenLight: "#E7F7F0",
  red: "#D64545", redLight: "#FBEAEA",
  amber: "#D98A1F", amberLight: "#FDF1DF",
  bg: "#F4F6FA", card: "#FFFFFF", border: "#E6E9F0",
  text: "#16233B", muted: "#71809A",
};
export const FD = "'Sora', system-ui, sans-serif";
export const FB = "'Inter', system-ui, sans-serif";
export const DEPARTMENTS = ["Informatique", "Administration", "Commercial", "Comptabilité", "RH"];
export const MOTIFS = ["Maladie", "Personnel", "Familial", "Rendez-vous administratif", "Autre"];

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function genSiteCode() {
  return "MB-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}
