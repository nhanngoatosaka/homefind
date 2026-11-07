const $ = id => document.getElementById(id);
let DATA = [], lang = localStorage.lang || "vi", cur = localStorage.cur || "JPY";
const t = k => I18N[lang][k] || k;

function money(jpy) {
  if (!jpy) return "-";
  const v = jpy * SITE.rates[cur];
  const s = cur === "USD" ? Math.round(v).toLocaleString("en-US")
    : cur === "VND" ? (v >= 1e9 ? (v / 1e9).toFixed(2) + " tỷ" : Math.round(v / 1e6) + " triệu")
    : v >= 1e8 ? (v / 1e8).toFixed(2) + (lang === "ja" ? "億円" : "00M") : Math.round(v).toLocaleString("ja-JP");
  return (cur === "VND" ? "" : SITE.symbols[cur]) + s + (cur === "VND" ? " ₫" : "");
}
const tenure = p => t(p.tenure === "leasehold" ? "leasehold" : "freehold");
const seismic = p => t(p.seismic);

function render() {
  document.documentElement.lang = lang;
  $("brand").innerHTML = `${SITE.brand}<small>${SITE.areas.join(" · ")}</small>`;
  $("tagline").textContent = t("tagline"); $("about").textContent = t("about");
  $("foot").textContent = `© ${new Date().getFullYear()} ${SITE.brand} — ${SITE.contactEmail}`;
  const sel = (id, opts, val) => { $(id).innerHTML = opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join(""); $(id).value = val; };
  const c = $("fCity").value || "", pu = $("fPurpose").value || "", so = $("fSort").value || "new";
  sel("fCity", [["", t("city") + ": " + t("all")], ...SITE.areas.map(a => [a, a])], c);
  sel("fPurpose", [["", t("purpose") + ": " + t("all")], ["invest", t("invest")], ["live", t("live")]], pu);
  sel("fSort", [["new", t("sort") + ": " + t("s_new")], ["yield", t("s_yield")], ["price", t("s_price")]], so);
  let list = DATA.filter(p => (!c || p.city === c) && (!pu || p.purpose === pu));
  if (so === "yield") list.sort((a, b) => b.grossYield - a.grossYield);
  if (so === "price") list.sort((a, b) => a.price - b.price);
  $("list").innerHTML = list.map(p => `<div class="card" onclick="openP('${p.id}')">
    <img src="${p.image || ""}" loading="lazy" alt=""><div class="b">
    <div class="price">${money(p.price)}</div><div>${p.title[lang] || p.title.en}</div>
    <div class="sub">${p.city} ${p.ward || ""} · ${t("walk")} ${p.walkMin} ${t("min")} ${p.station}</div>
    <div class="tags"><span class="tag">${p.layout}</span><span class="tag">${p.area}㎡</span><span class="tag">${p.yearBuilt}</span>
    <span class="tag">${tenure(p)}</span>${p.grossYield ? `<span class="tag y">${t("gross")} ${p.grossYield}%</span>` : ""}</div></div></div>`).join("") || `<p>${t("noresult")}</p>`;
}

window.openP = id => {
  const p = DATA.find(x => x.id === id);
  const rows = [[t("price"), money(p.price)], [t("station"), `${p.station} · ${t("walk")} ${p.walkMin} ${t("min")}`],
    [t("layout"), p.layout], [t("area"), p.area + " ㎡"], [t("year"), p.yearBuilt], [t("structure"), p.structure], [t("floor"), p.floor],
    [t("tenure"), tenure(p)], [t("seismic"), seismic(p)],
    [t("mgmt"), money(p.mgmtFee) + t("permonth")], [t("repair"), money(p.repairFund) + t("permonth")]];
  if (p.annualRent) rows.push([t("rent"), money(p.annualRent)], [t("gross"), p.grossYield + "%"], [t("net"), p.netYield + "%"]);
  $("box").innerHTML = `<img src="${p.image || ""}" alt=""><div class="in"><h3>${p.title[lang] || p.title.en}</h3>
    <p>${(p.desc && (p.desc[lang] || p.desc.en)) || ""}</p><table>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table><br>
    <a class="btn" href="mailto:${SITE.contactEmail}?subject=${p.id}">${t("contact")}</a></div>`;
  $("modal").classList.add("on");
};
$("modal").onclick = e => { if (e.target.id === "modal") $("modal").classList.remove("on"); };
$("lang").value = lang; $("cur").value = cur;
$("lang").onchange = e => { lang = localStorage.lang = e.target.value; render(); };
$("cur").onchange = e => { cur = localStorage.cur = e.target.value; render(); };
["fCity", "fPurpose", "fSort"].forEach(i => $(i).onchange = render);
fetch("data/properties.json").then(r => r.json()).then(d => { DATA = d; render(); });
