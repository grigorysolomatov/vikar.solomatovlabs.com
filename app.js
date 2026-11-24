// vikar-prep: hash router. #/ -> grades, #/6 -> subjects,
// #/6/matematikk -> topics, #/6/matematikk/<id> -> topic page.
"use strict";
const app = document.getElementById("app");
const crumbs = document.getElementById("crumbs");
let DATA = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const STAGE_NOTE = {
  2: "1.–2. trinn bruker kompetansemålene etter 2. trinn.",
  4: "3.–4. trinn bruker kompetansemålene etter 4. trinn.",
  7: "5.–7. trinn bruker kompetansemålene etter 7. trinn.",
};

function setCrumbs(parts) {
  crumbs.innerHTML = parts.map((p, i) => i === parts.length - 1
    ? `<span class="here">${esc(p[0])}</span>`
    : `<a href="${p[1]}">${esc(p[0])}</a>`).join('<span class="sep">/</span>');
}

function subjectsFor(grade) {
  return DATA.subjects.filter((s) => s.grades[grade]);
}

function viewHome() {
  setCrumbs([["Velg trinn", "#/"]]);
  const tiles = [1, 2, 3, 4, 5, 6, 7].map((g) => {
    return `<a class="tile" href="#/${g}"><div class="big">${g}.</div>
      <div class="sub">trinn</div></a>`;
  }).join("");
  app.innerHTML = `
    <p class="kicker">Barneskole · LK20</p>
    <h1>Vikar i dag?</h1>
    <p class="lead">Velg trinn, fag og tema, og få et ferdig opplegg for
      én time. Bare tavle, papir og blyant trengs.</p>
    <div class="grid grades">${tiles}</div>`;
}

function viewGrade(g) {
  setCrumbs([["Trinn", "#/"], [`${g}. trinn`, `#/${g}`]]);
  const tiles = subjectsFor(g).map((s) => {
    const t = s.grades[g].topics;
    return `<a class="tile" href="#/${g}/${s.slug}">
      <div class="name">${esc(s.name)}</div>
      <div class="count">${t.length} temaer</div></a>`;
  }).join("");
  app.innerHTML = `
    <h1>Hvilket fag?</h1>
    <div class="grid">${tiles}</div>`;
}

function viewSubject(g, slug) {
  const s = DATA.subjects.find((x) => x.slug === slug);
  if (!s || !s.grades[g]) return viewNotFound();
  setCrumbs([["Trinn", "#/"], [`${g}. trinn`, `#/${g}`],
    [s.name, `#/${g}/${slug}`]]);
  const gd = s.grades[g];
  const items = gd.topics.map((t, i) => {
    const inner = `<span class="n">${i + 1}</span><span class="body">
      <span class="t">${esc(t.title)}</span><br>
      <span class="s">${esc(t.summary)}</span></span>
      ${t.pdf ? "" : '<span class="badge soon">kommer snart</span>'}`;
    return `<li><a class="topic ${t.pdf ? "" : "soon"}" id="t-${t.id}"
      href="#/${g}/${slug}/${t.id}">${inner}</a></li>`;
  }).join("");
  const stageNote = slug === "matematikk"
    ? `Matematikk har egne kompetansemål for hvert trinn; her brukes målene etter ${gd.stage}. trinn.`
    : (gd.stage === 4 && g <= 2
      ? `Faget har ingen mål etter 2. trinn; her brukes målene etter 4. trinn.`
      : (STAGE_NOTE[gd.stage] || `Her brukes målene etter ${gd.stage}. trinn.`));
  app.innerHTML = `
    <h1>Velg et tema</h1>
    <div class="actions">
      <button class="btn" id="rnd">Tilfeldig tema</button>
    </div>
    <ul class="list">${items}</ul>
    <p class="muted small" style="margin-top:14px">${esc(stageNote)}
      <a href="${esc(s.udir_page)}" target="_blank" rel="noopener">Læreplan ${esc(s.plan_code)}</a></p>`;
  document.getElementById("rnd").onclick = () => {
    const pool = gd.topics.filter((t) => t.pdf);
    const from = pool.length ? pool : gd.topics;
    const t = from[Math.floor(Math.random() * from.length)];
    location.hash = `#/${g}/${slug}/${t.id}`;
  };
}

function viewTopic(g, slug, id) {
  const s = DATA.subjects.find((x) => x.slug === slug);
  const t = s && s.grades[g] && s.grades[g].topics.find((x) => x.id === id);
  if (!t) return viewNotFound();
  setCrumbs([["Trinn", "#/"], [`${g}. trinn`, `#/${g}`],
    [s.name, `#/${g}/${slug}`]]);
  const aims = t.aims.map((a) =>
    `<li><code>${esc(a.code)}</code>${esc(a.text)}</li>`).join("");
  app.innerHTML = `
    <div class="detail">
    <h1>${esc(t.title)}</h1>
    <p class="lead">${esc(t.summary)}</p>
    ${t.pdf
      ? `<div class="actions"><a class="btn primary" href="${t.pdf}" target="_blank" rel="noopener">Åpne opplegget (PDF)</a></div>`
      : `<div class="soonbox">Opplegget for dette temaet kommer snart.
         Velg gjerne et annet tema eller trykk «Tilfeldig tema».</div>`}
    <p class="kicker" style="margin-top:26px">Kompetansemål etter ${s.grades[g].stage}. trinn</p>
    <ul class="aimlist">${aims}</ul>
    </div>`;
}

function viewNotFound() {
  setCrumbs([["Trinn", "#/"]]);
  app.innerHTML = `<h1>Fant ikke siden</h1><p><a href="#/">Til forsiden</a></p>`;
}

function route() {
  if (!DATA) return;
  const p = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const g = p[0] ? parseInt(p[0], 10) : null;
  if (!p.length) viewHome();
  else if (!(g >= 1 && g <= 7)) viewNotFound();
  else if (p.length === 1) viewGrade(g);
  else if (p.length === 2) viewSubject(g, p[1]);
  else viewTopic(g, p[1], p[2]);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
fetch("data.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
  DATA = d; route();
}).catch(() => {
  app.innerHTML = "<p>Kunne ikke laste data.</p>";
});