/* ============================================================
   AllerScan — scanner di allergeni con Open Food Facts
   ============================================================ */

const STORAGE_KEY = "allerscan.allergens";
const HISTORY_KEY = "allerscan.history";
const HISTORY_MAX = 50;
const OFF_BASE = "https://world.openfoodfacts.org";

/* ---- Dizionario sinonimi (italiano <-> termini tag inglesi) ----
   Aiuta a far combaciare ciò che scrive l'utente con i dati OFF,
   che mescolano italiano nel testo ingredienti e tag in inglese. */
const SYNONYMS = {
  "latte":        ["latte", "milk", "lactose", "lattosio", "siero di latte", "whey", "caseina", "casein", "burro", "butter", "panna", "cream", "formaggio"],
  "lattosio":     ["lattosio", "lactose", "latte", "milk"],
  "glutine":      ["glutine", "gluten", "frumento", "wheat", "grano", "orzo", "barley", "segale", "rye", "avena", "oats", "farro", "spelt", "farina di frumento"],
  "frumento":     ["frumento", "wheat", "grano", "farina di frumento"],
  "uova":         ["uova", "uovo", "egg", "eggs", "albume", "tuorlo"],
  "arachidi":     ["arachidi", "arachide", "peanut", "peanuts"],
  "frutta a guscio": ["frutta a guscio", "nuts", "nut", "mandorl", "almond", "nocciol", "hazelnut", "noci", "walnut", "anacardi", "cashew", "pistacch", "pistachio", "noce di macadamia"],
  "soia":         ["soia", "soy", "soya", "lecitina di soia"],
  "pesce":        ["pesce", "fish", "tonno", "tuna", "salmone", "salmon", "acciug", "anchovy", "merluzzo"],
  "crostacei":    ["crostacei", "crostaceo", "crustacean", "gamber", "shrimp", "prawn", "granchio", "crab", "aragosta", "lobster"],
  "molluschi":    ["molluschi", "mollusc", "vongol", "clam", "cozze", "mussel", "calamar", "squid", "polpo"],
  "sesamo":       ["sesamo", "sesame"],
  "sedano":       ["sedano", "celery"],
  "senape":       ["senape", "mustard"],
  "solfiti":      ["solfiti", "solfito", "sulphite", "sulfite", "anidride solforosa", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"],
  "lupini":       ["lupini", "lupino", "lupin"],
};

let allergens = loadAllergens();

/* ============================================================
   Gestione allergeni (localStorage)
   ============================================================ */
function loadAllergens() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveAllergens() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allergens));
}
function addAllergen(value) {
  const v = value.trim().toLowerCase();
  if (!v) return;
  if (!allergens.includes(v)) {
    allergens.push(v);
    saveAllergens();
    renderAllergens();
  }
}
function removeAllergen(value) {
  allergens = allergens.filter(a => a !== value);
  saveAllergens();
  renderAllergens();
}
function renderAllergens() {
  const list = document.getElementById("allergen-list");
  const empty = document.getElementById("allergen-empty");
  list.innerHTML = "";
  allergens.forEach(a => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = a;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "Rimuovi";
    btn.onclick = () => removeAllergen(a);
    li.append(span, btn);
    list.appendChild(li);
  });
  empty.style.display = allergens.length ? "none" : "block";
}

/* ============================================================
   Cronologia scansioni (localStorage)
   ============================================================ */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}
function addToHistory(entry) {
  let list = loadHistory().filter(e => e.code !== entry.code); // dedup per codice
  list.unshift(entry);
  if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX);
  saveHistory(list);
  renderHistory();
}
function clearHistory() {
  saveHistory([]);
  renderHistory();
}
const STATUS_ICON = { danger: "🚫", traces: "⚠️", safe: "✅", unknown: "ℹ️", nodata: "⚠️" };

function renderHistory() {
  const list = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  const items = loadHistory();
  list.innerHTML = "";
  items.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${e.image ? `<img src="${escapeHtml(e.image)}" alt="" />` : `<div style="width:46px;height:46px;background:#f1f5f9;border-radius:8px;flex-shrink:0"></div>`}
      <div class="h-info">
        <div class="h-name">${escapeHtml(e.name || "Prodotto " + e.code)}</div>
        <div class="h-time">${escapeHtml(e.brand || "")}${e.brand ? " · " : ""}${formatTime(e.ts)}</div>
      </div>
      <div class="h-badge">${STATUS_ICON[e.status] || ""}</div>`;
    li.addEventListener("click", () => {
      document.querySelector('.tab-btn[data-tab="scan"]').click();
      lookupProduct(e.code);
    });
    list.appendChild(li);
  });
  empty.style.display = items.length ? "none" : "block";
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* Termini di ricerca espansi per un allergene dato */
function termsFor(allergen) {
  const key = allergen.toLowerCase();
  const base = SYNONYMS[key] ? [...SYNONYMS[key]] : [];
  if (!base.includes(key)) base.push(key);
  return base.map(t => t.toLowerCase());
}

/* ============================================================
   Tab navigation
   ============================================================ */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* ============================================================
   Form allergeni
   ============================================================ */
document.getElementById("allergen-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("allergen-input");
  addAllergen(input.value);
  input.value = "";
  input.focus();
});
document.querySelectorAll(".chip-suggest").forEach(chip => {
  chip.addEventListener("click", () => addAllergen(chip.dataset.value));
});

/* ============================================================
   Stato / messaggi
   ============================================================ */
function setStatus(msg, type = "info") {
  const el = document.getElementById("status");
  if (!msg) { el.hidden = true; return; }
  el.hidden = false;
  el.className = "status " + type;
  el.textContent = msg;
}

/* ============================================================
   Scanner codici a barre (ZXing)
   ============================================================ */
let codeReader = null;
let scanning = false;

async function startScanner() {
  if (typeof ZXing === "undefined") {
    setStatus("Libreria scanner non caricata (serve connessione internet).", "error");
    return;
  }
  try {
    codeReader = codeReader || new ZXing.BrowserMultiFormatReader();
    setStatus("Inquadra il codice a barre…", "loading");
    document.getElementById("start-btn").hidden = true;
    document.getElementById("stop-btn").hidden = false;
    scanning = true;

    await codeReader.decodeFromVideoDevice(null, "video", (result, err) => {
      if (result && scanning) {
        const code = result.getText();
        stopScanner();
        lookupProduct(code);
      }
    });
  } catch (e) {
    setStatus("Impossibile accedere alla fotocamera: " + e.message + ". Usa l'inserimento manuale.", "error");
    stopScanner();
  }
}

function stopScanner() {
  scanning = false;
  if (codeReader) {
    try { codeReader.reset(); } catch {}
  }
  document.getElementById("start-btn").hidden = false;
  document.getElementById("stop-btn").hidden = true;
}

document.getElementById("start-btn").addEventListener("click", startScanner);
document.getElementById("stop-btn").addEventListener("click", () => {
  stopScanner();
  setStatus("Scansione interrotta.", "info");
});

/* Inserimento manuale */
document.getElementById("manual-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("manual-input");
  const code = input.value.trim();
  if (code) lookupProduct(code);
});

/* Ricerca per nome prodotto */
document.getElementById("search-form").addEventListener("submit", e => {
  e.preventDefault();
  const q = document.getElementById("search-input").value.trim();
  if (q) searchByName(q);
});

/* Scorciatoie per supermercato (sfoglia i prodotti di un marchio) */
document.querySelectorAll(".chip-store").forEach(chip => {
  chip.addEventListener("click", () => searchByBrand(chip.dataset.brand, chip.textContent));
});

async function searchByBrand(brandTag, label) {
  document.getElementById("result").innerHTML = "";
  setStatus(`Carico i prodotti ${label}…`, "loading");
  try {
    const fields = "code,product_name,brands,image_front_small_url";
    const url = `${OFF_BASE}/api/v2/search?brands_tags=${encodeURIComponent(brandTag)}` +
      `&countries_tags=italy&sort_by=popularity_key&fields=${fields}&page_size=40`;
    const res = await fetch(url);
    const data = await res.json();
    const products = (data.products || []).filter(p => p.product_name && p.code);
    if (!products.length) {
      setStatus(`Nessun prodotto ${label} trovato. Prova a scansionare il codice a barre.`, "error");
      return;
    }
    setStatus("");
    renderSearchResults(products, label);
  } catch (e) {
    setStatus("Errore di rete: " + e.message, "error");
  }
}

/* ============================================================
   Ricerca per nome su Open Food Facts
   ============================================================ */
async function searchByName(query) {
  document.getElementById("result").innerHTML = "";
  setStatus(`Cerco prodotti per "${query}"…`, "loading");
  try {
    const fields = "code,product_name,brands,image_front_small_url";
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;
    const res = await fetch(url);
    const data = await res.json();
    const products = (data.products || []).filter(p => p.product_name && p.code);

    if (!products.length) {
      setStatus(`Nessun prodotto trovato per "${query}".`, "error");
      return;
    }
    setStatus("");
    renderSearchResults(products, query);
  } catch (e) {
    setStatus("Errore di rete nella ricerca: " + e.message, "error");
  }
}

function renderSearchResults(products, query) {
  const result = document.getElementById("result");
  const ul = products.map(p => `
    <li data-code="${escapeHtml(p.code)}">
      ${p.image_front_small_url ? `<img src="${escapeHtml(p.image_front_small_url)}" alt="" />`
        : `<div style="width:46px;height:46px;background:#f1f5f9;border-radius:8px;flex-shrink:0"></div>`}
      <div>
        <div class="sr-name">${escapeHtml(p.product_name)}</div>
        <div class="sr-brand">${escapeHtml(p.brands || "")}</div>
      </div>
    </li>`).join("");
  result.innerHTML = `<div class="search-results">
    <p class="sr-title">${products.length} risultati per "${escapeHtml(query)}" — tocca per analizzare</p>
    <ul>${ul}</ul>
  </div>`;
  result.querySelectorAll("li[data-code]").forEach(li => {
    li.addEventListener("click", () => lookupProduct(li.dataset.code));
  });
}

/* ============================================================
   Ricerca prodotto su Open Food Facts (database live: 3,6+ milioni
   di prodotti). Niente da precaricare: ogni codice viene cercato al volo.
   ============================================================ */
const PRODUCT_FIELDS = "product_name,brands,image_front_url,ingredients_text,ingredients_text_it,allergens_tags,traces_tags,categories_tags,nutriscore_grade,code";

/* Varianti plausibili dello stesso codice a barre, così uno scan riconosce
   anche prodotti salvati in un formato diverso (UPC-A 12 vs EAN-13, zeri iniziali). */
function barcodeVariants(code) {
  const c = String(code).replace(/\D/g, "");
  const set = new Set([c]);
  if (c.length === 12) set.add("0" + c);            // UPC-A → EAN-13
  if (c.length === 13 && c.startsWith("0")) set.add(c.slice(1)); // EAN-13 con zero → UPC-A
  if (c.length === 8) set.add(c.padStart(13, "0")); // EAN-8 → EAN-13 con padding
  return [...set];
}

async function fetchProduct(barcode) {
  const res = await fetch(`${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`);
  const data = await res.json();
  return (data && data.status !== 0 && data.product) ? data.product : null;
}

async function lookupProduct(barcode) {
  document.getElementById("result").innerHTML = "";
  setStatus("Cerco il prodotto " + barcode + "…", "loading");
  try {
    let product = null;
    for (const code of barcodeVariants(barcode)) {
      product = await fetchProduct(code);
      if (product) break;
    }

    if (!product) {
      const clean = String(barcode).replace(/\D/g, "");
      setStatus("", "error");
      document.getElementById("result").innerHTML = `
        <div class="product-card">
          <div class="verdict unknown">❓ Prodotto ${escapeHtml(clean)} non ancora nel database</div>
          <div class="section-block">
            <p>Questo codice non è ancora presente su Open Food Facts (database collaborativo).
            Controlla l'etichetta a mano per sicurezza.</p>
            <p style="margin-top:10px">Puoi <strong>aggiungerlo tu</strong> in 1 minuto, così la prossima volta verrà riconosciuto:</p>
            <a class="add-product-btn" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${encodeURIComponent(clean)}" target="_blank" rel="noopener">➕ Aggiungi questo prodotto</a>
          </div>
        </div>`;
      return;
    }
    setStatus("");
    analyzeAndRender(product);
  } catch (e) {
    setStatus("Errore di rete durante la ricerca: " + e.message, "error");
  }
}

/* ============================================================
   Analisi allergeni + rendering
   ============================================================ */
function getIngredientsText(product) {
  return product.ingredients_text_it || product.ingredients_text || "";
}

/* Restituisce { danger:[], traces:[], allTerms:[] } degli allergeni trovati */
function analyzeProduct(product) {
  const text = getIngredientsText(product).toLowerCase();
  const allergenTags = (product.allergens_tags || []).join(" ").toLowerCase();
  const tracesTags = (product.traces_tags || []).join(" ").toLowerCase();

  const danger = [];   // presente negli ingredienti / allergeni
  const traces = [];   // solo nelle tracce ("può contenere")
  const matchedTerms = [];

  allergens.forEach(allergen => {
    const terms = termsFor(allergen);
    let inMain = false, inTraces = false;
    terms.forEach(t => {
      if (text.includes(t) || allergenTags.includes(t)) { inMain = true; matchedTerms.push(t); }
      else if (tracesTags.includes(t)) { inTraces = true; }
    });
    if (inMain) danger.push(allergen);
    else if (inTraces) traces.push(allergen);
  });

  return { danger, traces, matchedTerms: [...new Set(matchedTerms)] };
}

/* Evidenzia i termini trovati nel testo ingredienti */
function highlightIngredients(text, terms) {
  if (!text) return "<em>Lista ingredienti non disponibile su Open Food Facts.</em>";
  let html = escapeHtml(text);
  // ordina per lunghezza decrescente per evitare match parziali sovrapposti
  [...terms].sort((a, b) => b.length - a.length).forEach(term => {
    if (!term) return;
    const re = new RegExp("(" + escapeRegExp(term) + ")", "gi");
    html = html.replace(re, "<mark>$1</mark>");
  });
  return html;
}

function nutriBadge(grade) {
  if (!grade) return "";
  const g = grade.toLowerCase();
  return `<span class="nutri nutri-${g}">Nutri-Score ${grade.toUpperCase()}</span>`;
}

async function analyzeAndRender(product) {
  const { danger, traces, matchedTerms } = analyzeProduct(product);
  const result = document.getElementById("result");
  const name = product.product_name || "Prodotto senza nome";
  const brand = product.brands || "";
  const img = product.image_front_url || "";
  const ingText = getIngredientsText(product);
  // Dati allergeni assenti se non c'è né la lista ingredienti né i tag allergeni
  const hasData = ingText.trim().length > 0 ||
    (product.allergens_tags && product.allergens_tags.length > 0);

  let verdictClass, verdictText, histStatus;
  if (allergens.length === 0) {
    verdictClass = "unknown"; histStatus = "unknown";
    verdictText = "ℹ️ Nessun allergene impostato — aggiungili nella scheda \"I miei allergeni\".";
  } else if (danger.length) {
    verdictClass = "danger"; histStatus = "danger";
    verdictText = "🚫 ATTENZIONE! Contiene: " + danger.join(", ").toUpperCase();
  } else if (traces.length) {
    verdictClass = "unknown"; histStatus = "traces";
    verdictText = "⚠️ Può contenere TRACCE di: " + traces.join(", ");
  } else if (!hasData) {
    // Trovato ma SENZA dati ingredienti: non è "sicuro", è "non verificabile"
    verdictClass = "unknown"; histStatus = "nodata";
    verdictText = "⚠️ Ingredienti non disponibili — non posso verificare. Controlla l'etichetta!";
  } else {
    verdictClass = "safe"; histStatus = "safe";
    verdictText = "✅ Nessuno dei tuoi allergeni rilevato";
  }

  // Salva nella cronologia (anche se nessun allergene impostato)
  addToHistory({
    code: product.code || "",
    name, brand,
    image: product.image_front_url || "",
    status: histStatus,
    ts: Date.now(),
  });

  let html = `
    <div class="product-card">
      <div class="verdict ${verdictClass}">${verdictText}</div>
      <div class="product-head">
        ${img ? `<img src="${escapeHtml(img)}" alt="" />` : ""}
        <div>
          <div class="pname">${escapeHtml(name)}</div>
          ${brand ? `<div class="pbrand">${escapeHtml(brand)}</div>` : ""}
          <div style="margin-top:6px">${nutriBadge(product.nutriscore_grade)}</div>
        </div>
      </div>`;

  if (danger.length) {
    html += `<div class="section-block">
      <h3>Allergeni trovati</h3>
      <ul class="match-list">
        ${danger.map(d => `<li>🚫 ${escapeHtml(d)}</li>`).join("")}
      </ul>
    </div>`;
  }
  if (traces.length) {
    html += `<div class="section-block">
      <h3>Possibili tracce</h3>
      <ul class="match-list">
        ${traces.map(d => `<li>⚠️ ${escapeHtml(d)}</li>`).join("")}
      </ul>
    </div>`;
  }

  html += `<div class="section-block">
      <h3>Ingredienti</h3>
      <div class="ingredients-text">${highlightIngredients(ingText, matchedTerms)}</div>
    </div>`;

  // Spazio per l'alternativa (caricata in modo asincrono)
  if (danger.length) {
    html += `<div class="section-block" id="alt-block">
      <h3>Alternativa consigliata</h3>
      <div id="alt-content" class="status loading" style="margin:0">Cerco un'alternativa senza ${escapeHtml(danger.join(", "))}…</div>
    </div>`;
  }

  html += `</div>`;
  result.innerHTML = html;

  if (danger.length) findAlternative(product);
}

/* ============================================================
   Ricerca di un'alternativa senza l'allergene
   ============================================================ */
async function findAlternative(product) {
  const altContent = document.getElementById("alt-content");
  const cats = product.categories_tags || [];
  if (!cats.length) {
    if (altContent) altContent.outerHTML = `<p class="empty-note">Categoria sconosciuta: nessuna alternativa automatica. Cerca un prodotto simile leggendo l'etichetta.</p>`;
    return;
  }
  // categoria più specifica (di solito l'ultima)
  const category = cats[cats.length - 1];

  try {
    const fields = "code,product_name,brands,image_front_small_url,nutriscore_grade,allergens_tags,traces_tags,ingredients_text,ingredients_text_it";
    const url = `${OFF_BASE}/api/v2/search?categories_tags=${encodeURIComponent(category)}&fields=${fields}&page_size=50&sort_by=nutriscore_score`;
    const res = await fetch(url);
    const data = await res.json();
    const candidates = (data.products || []).filter(p => {
      if (!p.product_name || p.code === product.code) return false;
      // riusa la logica di analisi: deve essere privo di allergeni dell'utente
      const a = analyzeProduct(p);
      return a.danger.length === 0 && a.traces.length === 0;
    });

    // preferisci con Nutri-Score migliore e con immagine
    candidates.sort((a, b) => nutriRank(a.nutriscore_grade) - nutriRank(b.nutriscore_grade));
    const best = candidates.find(p => p.image_front_small_url) || candidates[0];

    if (!best) {
      if (altContent) altContent.outerHTML = `<p class="empty-note">Nessuna alternativa sicura trovata automaticamente in questa categoria. Verifica sempre l'etichetta.</p>`;
      return;
    }

    const altHtml = `
      <div class="alt-card">
        ${best.image_front_small_url ? `<img src="${escapeHtml(best.image_front_small_url)}" alt="" />` : ""}
        <div>
          <div class="alt-name">${escapeHtml(best.product_name)}</div>
          <div class="alt-meta">${escapeHtml(best.brands || "")}</div>
          <div style="margin-top:4px">${nutriBadge(best.nutriscore_grade)}</div>
          <div class="alt-meta">Codice: ${escapeHtml(best.code)}</div>
        </div>
      </div>
      <p class="empty-note" style="margin-top:8px">Suggerimento automatico privo dei tuoi allergeni. Controlla comunque l'etichetta.</p>`;
    if (altContent) altContent.outerHTML = altHtml;
  } catch (e) {
    if (altContent) altContent.outerHTML = `<p class="empty-note">Impossibile cercare un'alternativa: ${escapeHtml(e.message)}</p>`;
  }
}

function nutriRank(grade) {
  const order = { a: 1, b: 2, c: 3, d: 4, e: 5 };
  return order[(grade || "").toLowerCase()] || 9;
}

/* ============================================================
   Utility
   ============================================================ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Pulsante svuota cronologia */
document.getElementById("clear-history").addEventListener("click", () => {
  if (confirm("Vuoi svuotare la cronologia delle scansioni?")) clearHistory();
});

/* Esporta cronologia (JSON scaricabile) */
document.getElementById("export-history").addEventListener("click", () => {
  const items = loadHistory();
  if (!items.length) { alert("La cronologia è vuota."); return; }
  const payload = {
    app: "AllerScan",
    esportato: new Date().toISOString(),
    allergeni: allergens,
    scansioni: items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `allerscan-cronologia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* ============================================================
   Avvio
   ============================================================ */
renderAllergens();
renderHistory();
if (allergens.length === 0) {
  // porta l'utente prima a impostare gli allergeni
  document.querySelector('.tab-btn[data-tab="allergens"]').click();
}
