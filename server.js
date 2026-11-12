// Simple Express server: site serve karta hai aur Supabase keys .env se deta hai
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_ANON_KEY set nahi hai (.env ya Render Environment me daalo)");
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// config.js env variables se banta hai (keys code me hardcode nahi karni padti)
app.get("/config.js", (req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-store");
  res.send(
    `export const SUPABASE_URL = ${JSON.stringify(SUPABASE_URL || "")};\n` +
    `export const SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY || "")};\n`
  );
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log("Server chal raha hai: port " + PORT));
