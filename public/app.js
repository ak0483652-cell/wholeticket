import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CATS = [["M", "M Work"], ["R", "R Work"], ["G", "G Work"], ["J", "J Work"]];
const MIN = 10, MAX = 200;
const $ = (s) => document.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const inr = (n) => "₹" + (Math.round(Number(n) * 100) / 100).toLocaleString("en-IN");
let me = null, tab = "M", bal = { earned: 0, paid: 0, locked: 0, available: 0 };

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return loginView();
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) { app.innerHTML = `<p class="no">Profile load nahi hua: ${esc(error.message)}</p>`; return; }
  me = data;
  await render();
}
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") boot(); });

function loginView(msg = "") {
  app.innerHTML = `<div class="card login"><h1>Work Portal</h1>
  <p class="mu">Login ya naya account banao</p>
  <input id="em" type="email" placeholder="Email (Gmail)"><input id="pw" type="password" placeholder="Password (min 6)">
  <button class="b" data-act="login">Login</button> <button class="b l" data-act="signup">Sign up</button>
  <p><button class="b g" data-act="google">Google se login</button></p><p class="no">${esc(msg)}</p></div>`;
}

async function render() {
  const t = [...CATS, ["W", "Wallet"]];
  if (me.is_admin) t.push(["A", "Admin"]);
  const { data: b } = await sb.rpc("my_balance"); if (b) bal = b;
  app.innerHTML = `<div class="top"><h1>Work Portal</h1><span class="mu">${esc(me.email)}</span>
  <span><span class="bal">${inr(bal.available)}</span> <button class="b l" data-act="logout">Logout</button></span></div>
  <div class="tabs">${t.map(([k, l]) => `<button class="tab ${tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
  <div id="main"><p class="mu">Loading…</p></div>`;
  const m = $("#main");
  if (tab === "W") m.innerHTML = await walletView();
  else if (tab === "A" && me.is_admin) m.innerHTML = await adminView();
  else m.innerHTML = await tasksView(tab);
}

async function tasksView(cat) {
  const [{ data: tasks }, { data: subs }] = await Promise.all([
    sb.from("tasks").select("*").eq("category", cat).order("created_at", { ascending: false }),
    sb.from("submissions").select("*").eq("user_id", me.id),
  ]);
  const sm = Object.fromEntries((subs || []).map((s) => [s.task_id, s]));
  const html = (tasks || []).filter((t) => !t.assigned_to || t.assigned_to === me.id).map((t) => {
    const s = sm[t.id];
    const st = !s ? '<span class="tag">Open</span>' : s.status === "approved" ? '<span class="tag ok">Approved ✓</span>'
      : s.status === "rejected" ? '<span class="tag no">Rejected</span>' : '<span class="tag wa">Review pending</span>';
    const act = s && s.status === "approved" ? "" :
      `<textarea id="pf-${t.id}" rows="2" placeholder="Proof / link / note">${esc(s?.proof || "")}</textarea>
       <button class="b" data-submit="${t.id}">${s ? "Update" : "Submit"} work</button>`;
    return `<div class="card"><div class="row"><b>${esc(t.title)}</b><span>${inr(t.reward)} ${st}</span></div>
      <div class="mu">${esc(t.description)}</div>${act}</div>`;
  }).join("");
  return `<h2>${CATS.find((c) => c[0] === cat)[1]} Dashboard</h2>` + (html || '<p class="mu">Abhi koi kaam assign nahi hua.</p>');
}

async function walletView() {
  const { data: wd } = await sb.from("withdrawals").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  const cls = { paid: "ok", rejected: "no", accepted: "ok", pending: "wa" };
  return `<div class="card"><div class="row"><div>Earned<br><b>${inr(bal.earned)}</b></div><div>Paid<br><b>${inr(bal.paid)}</b></div>
  <div>Locked<br><b>${inr(bal.locked - bal.paid)}</b></div><div>Available<br><b class="ok">${inr(bal.available)}</b></div></div></div>
  <h2>Withdrawal (min ${inr(MIN)} · max ${inr(MAX)})</h2><div class="card">
  <input id="wa" type="number" min="${MIN}" max="${MAX}" placeholder="Amount ₹"><input id="wu" placeholder="UPI ID / bank details">
  <button class="b" data-act="withdraw">Request withdrawal</button></div>
  <h2>History</h2>` + ((wd || []).map((w) => `<div class="card row"><span>${inr(w.amount)} · ${esc(w.upi)}</span>
  <span class="${cls[w.status]}">${w.status.toUpperCase()}</span></div>`).join("") || '<p class="mu">Abhi koi request nahi.</p>');
}

async function adminView() {
  const [{ data: users }, { data: subs }, { data: wds }, { data: tasks }] = await Promise.all([
    sb.from("profiles").select("id,email,full_name").order("email"),
    sb.from("submissions").select("*, tasks(title,reward), profiles(email,full_name)").eq("status", "pending").order("updated_at"),
    sb.from("withdrawals").select("*, profiles(email,full_name)").in("status", ["pending", "accepted"]).order("created_at"),
    sb.from("tasks").select("*, profiles(email)").order("created_at", { ascending: false }),
  ]);
  const who = (p) => esc(p?.full_name || "") + " (" + esc(p?.email || "") + ")";
  return `<h2>Naya kaam assign karo</h2><div class="card">
  <select id="tc">${CATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
  <input id="tt" placeholder="Task title"><textarea id="td" rows="2" placeholder="Details"></textarea>
  <input id="tr" type="number" placeholder="Reward ₹">
  <select id="ta"><option value="">Sabko (everyone)</option>${(users || []).map((u) => `<option value="${u.id}">${esc(u.email)}</option>`).join("")}</select>
  <button class="b" data-act="addtask">Assign</button></div>
  <h2>Review pending (${(subs || []).length})</h2>` +
    ((subs || []).map((s) => `<div class="card"><div class="row"><b>${esc(s.tasks?.title)}</b><span class="mu">${who(s.profiles)} · ${inr(s.tasks?.reward)}</span></div>
    <div>${esc(s.proof)}</div><button class="b g" data-rev="${s.id}|approved">Approve</button> <button class="b r" data-rev="${s.id}|rejected">Reject</button></div>`).join("") || '<p class="mu">Kuch pending nahi.</p>') +
    `<h2>Withdrawals (${(wds || []).length})</h2>` +
    ((wds || []).map((w) => `<div class="card"><div class="row"><b>${who(w.profiles)} · ${inr(w.amount)}</b><span class="mu">${esc(w.upi)} · ${w.status}</span></div>
    ${w.status === "pending" ? `<button class="b l" data-wd="${w.id}|accepted">Accept</button> ` : ""}
    <button class="b g" data-wd="${w.id}|paid">Mark paid</button> <button class="b r" data-wd="${w.id}|rejected">Reject</button></div>`).join("") || '<p class="mu">Kuch pending nahi.</p>') +
    `<h2>Saare tasks (${(tasks || []).length})</h2>` +
    (tasks || []).map((t) => `<div class="card row"><span>[${t.category}] ${esc(t.title)} · ${inr(t.reward)} · ${t.assigned_to ? esc(t.profiles?.email) : "Everyone"}</span>
    <button class="b r" data-del="${t.id}">Delete</button></div>`).join("");
}

const fail = (e) => e && alert(e.message);
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.tab) { tab = d.tab; return render(); }
  if (d.act === "login" || d.act === "signup") {
    const email = $("#em").value.trim(), password = $("#pw").value;
    const { error } = d.act === "login" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    if (error) loginView(error.message); else if (d.act === "signup") loginView("Account ban gaya. Agar email confirm maanga ho to inbox check karo, phir login karo.");
    return;
  }
  if (d.act === "google") return fail((await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } })).error);
  if (d.act === "logout") { await sb.auth.signOut(); return; }
  if (d.submit) { const v = $("#pf-" + d.submit).value.trim(); if (!v) return; fail((await sb.rpc("submit_work", { p_task: d.submit, p_proof: v })).error); return render(); }
  if (d.act === "withdraw") {
    const a = Number($("#wa").value), u = $("#wu").value.trim();
    if (!(a >= MIN && a <= MAX)) return alert(`Withdrawal ${inr(MIN)} se ${inr(MAX)} ke beech hona chahiye`);
    fail((await sb.rpc("request_withdrawal", { p_amount: a, p_upi: u })).error); return render();
  }
  if (d.act === "addtask") {
    const title = $("#tt").value.trim(); if (!title) return;
    fail((await sb.from("tasks").insert({ category: $("#tc").value, title, description: $("#td").value, reward: Number($("#tr").value || 0), assigned_to: $("#ta").value || null })).error);
    return render();
  }
  if (d.rev) { const [id, s] = d.rev.split("|"); fail((await sb.rpc("review_submission", { p_id: id, p_status: s })).error); return render(); }
  if (d.wd) { const [id, s] = d.wd.split("|"); fail((await sb.rpc("set_withdrawal_status", { p_id: id, p_status: s })).error); return render(); }
  if (d.del && confirm("Delete?")) { fail((await sb.from("tasks").delete().eq("id", d.del)).error); return render(); }
});
boot();
