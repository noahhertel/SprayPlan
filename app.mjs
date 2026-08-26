import React, { useState, useEffect, useMemo, useCallback } from "https://esm.sh/react@18.3.1";
import { Droplets, History, BookOpen, ClipboardList, AlertTriangle, Scissors, Plus, Trash2, Waves, CloudRain, Thermometer, Sprout, Search, ChevronRight, X, Check, MapPin, Pencil, Layers } from "https://esm.sh/lucide-react@0.383.0?deps=react@18.3.1";
import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";

/* ============================================================
   LOCAL STORAGE SHIM
   Standalone replacement for the Claude-artifact-only window.storage
   API, backed by the browser's real localStorage. Same method shapes
   (get/set/delete/list, all async, all return {key, value} objects)
   so none of the app code below needs to change.
   ============================================================ */
const STORAGE_PREFIX = "spray-ticket:";
window.storage = {
  async get(key) {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    if (v === null) return null;
    return {
      key,
      value: v
    };
  },
  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
      return {
        key,
        value
      };
    } catch (e) {
      return null;
    }
  },
  async delete(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return {
      key,
      deleted: true
    };
  },
  async list(prefix) {
    const full = STORAGE_PREFIX + (prefix || "");
    const keys = Object.keys(localStorage).filter(k => k.startsWith(full)).map(k => k.slice(STORAGE_PREFIX.length));
    return {
      keys
    };
  }
};

/* ============================================================
   REFERENCE DATA
   ============================================================ */

const WEEDS = [{
  id: "dallisgrass",
  name: "Dallisgrass",
  type: "grass"
}, {
  id: "johnsongrass",
  name: "Johnsongrass",
  type: "grass"
}, {
  id: "vaseygrass",
  name: "Vaseygrass",
  type: "grass"
}, {
  id: "crabgrass",
  name: "Crabgrass",
  type: "grass"
}, {
  id: "sandbur",
  name: "Sandbur",
  type: "grass"
}, {
  id: "bahiagrass",
  name: "Bahiagrass (volunteer)",
  type: "grass"
}, {
  id: "goosegrass",
  name: "Goosegrass",
  type: "grass"
}, {
  id: "barnyardgrass",
  name: "Barnyardgrass",
  type: "grass"
}, {
  id: "ryegrass",
  name: "Annual Ryegrass (volunteer)",
  type: "grass"
}, {
  id: "texaspanicum",
  name: "Texas / Fall Panicum",
  type: "grass"
}, {
  id: "smutgrass",
  name: "Smutgrass",
  type: "grass"
}, {
  id: "nutsedge",
  name: "Yellow / Purple Nutsedge",
  type: "sedge"
}, {
  id: "pigweed",
  name: "Pigweed / Palmer Amaranth",
  type: "broadleaf"
}, {
  id: "ragweed",
  name: "Ragweed",
  type: "broadleaf"
}, {
  id: "horsenettle",
  name: "Horsenettle",
  type: "broadleaf"
}, {
  id: "buttercup",
  name: "Buttercup",
  type: "broadleaf"
}, {
  id: "thistle",
  name: "Thistle",
  type: "broadleaf"
}, {
  id: "cocklebur",
  name: "Cocklebur",
  type: "broadleaf"
}, {
  id: "dock",
  name: "Curly Dock",
  type: "broadleaf"
}, {
  id: "plantain",
  name: "Plantain",
  type: "broadleaf"
}, {
  id: "sericea",
  name: "Sericea Lespedeza",
  type: "broadleaf"
}, {
  id: "smilax",
  name: "Smilax / Greenbrier",
  type: "brush"
}, {
  id: "dewberry",
  name: "Dewberry / Blackberry",
  type: "brush"
}, {
  id: "privet",
  name: "Privet",
  type: "brush"
}, {
  id: "mesquite",
  name: "Mesquite",
  type: "brush"
}, {
  id: "pricklypear",
  name: "Prickly Pear",
  type: "brush"
}];

// grazingRestrictionDays / hayRestrictionDays: null = none on label (beef cattle, general),
// "varies" = check label / dairy vs beef differ. manureMonths = carryover restriction on
// treated hay/manure used off-property (relevant since hay is given away here).
// formulation/mixCategory drives WALES/DALES tank-mix ordering:
//   'dry'      = water-dispersible granule / dry flowable — add to water first
//   'soluble'  = water-soluble liquid (amine/SL) — add after dry products
//   'ec'       = emulsifiable concentrate / ester — add after soluble liquids, before surfactant
// rateLowOz/rateHighOz are numeric, in the unit given by rateUnit, so the app can compute
// oz/ac and total-oz-for-field without parsing free text.
const HERBICIDES = [{
  id: "24d",
  name: "2,4-D amine (e.g. Weedar 64)",
  moa: "4 (Synthetic Auxin)",
  targets: ["pigweed", "ragweed", "cocklebur", "dock", "plantain", "thistle", "horsenettle"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 16,
  rateHighOz: 32,
  rateUnit: "fl oz/ac",
  rate: "16–32 fl oz/ac (1–2 pt/ac)",
  grazing: "0 days (beef); check label for dairy/lactating",
  hay: "7 days before cutting (varies by label)",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Above 60°F, actively growing, before bloom",
  notes: "Cheap, effective on young broadleaves. Volatile ester forms can drift onto trees/gardens — use amine near sensitive areas.",
  restrictedUse: false
}, {
  id: "grazonnext",
  name: "GrazonNext HL (aminopyralid + 2,4-D)",
  moa: "4",
  targets: ["thistle", "ragweed", "horsenettle", "dewberry", "cocklebur", "dock", "sericea"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 19.2,
  rateHighOz: 24,
  rateUnit: "fl oz/ac",
  rate: "19.2–24 fl oz/ac (1.2–1.5 pt/ac)",
  grazing: "No restriction, beef or dairy",
  hay: "No cutting restriction, but treated hay/manure carries residue",
  manureMonths: 18,
  waterBufferFt: 100,
  tempWindow: "Spring or fall, active growth, before bud stage on thistle",
  notes: "Aminopyralid persists in hay, manure, and compost for a long time — do NOT give away, sell, or spread manure/hay from treated fields where it could reach gardens, tomatoes, or other broadleaf crops downstream. This is the #1 misuse complaint with this product.",
  restrictedUse: false
}, {
  id: "milestone",
  name: "Milestone (aminopyralid)",
  moa: "4",
  targets: ["thistle", "ragweed", "dock", "sericea"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 3,
  rateHighOz: 7,
  rateUnit: "fl oz/ac",
  rate: "3–7 fl oz/ac",
  grazing: "No restriction",
  hay: "No cutting restriction",
  manureMonths: 18,
  waterBufferFt: 100,
  tempWindow: "Spring rosette stage best",
  notes: "Very grass-safe, low use rate. Same manure/hay carryover caution as GrazonNext.",
  restrictedUse: false
}, {
  id: "pasturegard",
  name: "PastureGard HL (triclopyr + fluroxypyr)",
  moa: "4",
  targets: ["dewberry", "smilax", "privet", "mesquite", "pricklypear", "horsenettle"],
  use: ["pasture", "hay"],
  formulation: "ec",
  rateLowOz: 16,
  rateHighOz: 32,
  rateUnit: "fl oz/ac",
  rate: "16–32 fl oz/ac foliar (1–2 pt/ac); higher for brush/basal",
  grazing: "No restriction for beef; lactating dairy 3 days",
  hay: "No restriction (beef)",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Actively growing brush, full leaf-out",
  notes: "Good all-around brush + broadleaf combo where you don't have a manure/hay carryover concern.",
  restrictedUse: false
}, {
  id: "remedyultra",
  name: "Remedy Ultra (triclopyr ester)",
  moa: "4",
  targets: ["smilax", "dewberry", "privet", "mesquite", "pricklypear"],
  use: ["pasture", "hay"],
  formulation: "ec",
  rateLowOz: 16,
  rateHighOz: 64,
  rateUnit: "fl oz/ac",
  rate: "16–64 fl oz/ac foliar (1–4 pt/ac); up to 1 gal basal bark in oil carrier (not per-acre broadcast)",
  grazing: "No restriction for beef cattle",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Full leaf brush, or dormant season for basal bark",
  notes: "Already in your rotation for smilax. Ester formulation volatilizes in heat — avoid spraying above ~85°F near sensitive trees/gardens.",
  restrictedUse: false
}, {
  id: "pastora",
  name: "Pastora (metsulfuron + nicosulfuron)",
  moa: "2 (ALS inhibitor)",
  targets: ["johnsongrass", "crabgrass", "pigweed", "ragweed", "horsenettle", "sandbur", "vaseygrass", "bahiagrass", "goosegrass", "barnyardgrass", "texaspanicum", "ryegrass"],
  use: ["pasture", "hay"],
  formulation: "dry",
  rateLowOz: 1,
  rateHighOz: 1.5,
  rateUnit: "oz/ac (dry wt.)",
  rate: "1–1.5 oz/ac + NIS",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Johnsongrass 12–24\" tall, actively growing",
  notes: "Already in your rotation. Broader than the label headline suggests: at 1 oz/ac controls barnyardgrass, foxtails, Texas/fall panicum, Italian ryegrass, and suppresses goosegrass and seedling sandbur; at 1.5 oz/ac adds good bahiagrass and vaseygrass control. Don't exceed 2.5 oz/ac per year total. Bermudagrass can yellow/stunt temporarily. For perennial (regrowth) sandbur, the label response improves tank-mixed with glyphosate — see Tank Mix Builder.",
  restrictedUse: false
}, {
  id: "glyphosate",
  name: "Glyphosate (e.g. Roundup PowerMax)",
  moa: "9 (EPSP synthase inhibitor)",
  targets: ["dallisgrass", "johnsongrass", "bahiagrass", "ryegrass", "sandbur", "crabgrass", "vaseygrass"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 12,
  rateHighOz: 48,
  rateUnit: "fl oz/ac (varies hugely by use case — see notes)",
  rate: "12–16 fl oz/ac (post-cut stubble, sandbur/annual grasses) up to 1–3 pt/ac (dormant-season broadcast on dallisgrass/johnsongrass/bahiagrass/ryegrass)",
  grazing: "No restriction once spray has dried",
  hay: "No restriction once spray has dried",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Depends on method — see notes; do NOT broadcast on actively growing bermuda",
  notes: "⚠ Non-selective — this is only \"safe\" for bermuda because of WHEN or HOW you apply it, not the chemical itself: (1) broadcast during full bermudagrass dormancy (roughly Nov–Mar in East Texas) for dallisgrass, johnsongrass, bahiagrass, or ryegrass — dallisgrass has no other reliable postemergence option in bermuda; (2) spot-spray or wick/wiper application onto taller weeds above short bermuda anytime; or (3) a low rate (10–16 fl oz/ac) immediately after a hay cutting, before bermuda regrowth, for sandbur and other annual grasses. Broadcasting onto green, growing bermuda at these rates will injure or kill it. Preventing viable weed seed production is key — timing matters as much as the product.",
  restrictedUse: false
}, {
  id: "imazapic",
  name: "Imazapic (Panoramic 2SL / Impose / Plateau)",
  moa: "2 (ALS inhibitor)",
  targets: ["vaseygrass", "sandbur", "bahiagrass", "dallisgrass", "smutgrass", "barnyardgrass", "texaspanicum", "goosegrass"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 4,
  rateHighOz: 12,
  rateUnit: "fl oz/ac",
  rate: "4–12 fl oz/ac (see label for weed-specific rate)",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Apply after 100% bermudagrass green-up, to small/young target weeds",
  notes: "⚠ Bermudagrass-only — illegal on bahiagrass or other pasture grasses. Will visibly stunt and yellow bermuda for 20–40 days; some varieties (Jiggs, WorldFeeder) are more sensitive than others. Graze or hay the field short first so spray actually contacts small weeds. Same ALS mode of action (Group 2) as Pastora/Outrider/Sedgehammer/Chaparral — the tank-mix rules engine below will flag stacking these.",
  restrictedUse: false
}, {
  id: "pendimethalin",
  name: "Pendimethalin (Prowl H2O)",
  moa: "3 (Microtubule inhibitor)",
  targets: ["crabgrass", "sandbur", "ryegrass"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 35.2,
  rateHighOz: 134.4,
  rateUnit: "fl oz/ac (1.1–4.2 qt/ac)",
  rate: "1.1–4.2 qt/ac",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Dormant bermudagrass/bahiagrass ONLY — apply before weeds emerge, ahead of rain for incorporation",
  notes: "Pre-emergent, not postemergent — it stops germinating seed, it won't touch weeds already up. Needs ~0.5–0.75\" rain or irrigation within about a week to incorporate. Don't exceed 3.2–4.2 qt/ac per year (check current label). Some stunting/chlorosis possible if applied postemergence by mistake — this is a dormant-season, bare-ground timing product.",
  restrictedUse: false
}, {
  id: "indaziflam",
  name: "Indaziflam (Rezilon)",
  moa: "29 (Cellulose biosynthesis inhibitor)",
  targets: ["sandbur", "crabgrass"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 5,
  rateHighOz: 7,
  rateUnit: "fl oz/ac",
  rate: "5–7 fl oz/ac",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Established bermudagrass/bahiagrass, applied ahead of germination — newest pre-emergent option for sandbur",
  notes: "Newer chemistry than pendimethalin, with reported excellent southern sandbur control and no bermuda injury in university trials — worth a look if Prowl H2O timing hasn't been working out. Still a pre-emergent: apply before sandbur germinates, not after.",
  restrictedUse: false
}, {
  id: "paraquat",
  name: "Paraquat (Gramoxone Inteon/SL)",
  moa: "22 (Photosystem I inhibitor)",
  targets: ["ryegrass", "crabgrass", "bahiagrass"],
  use: ["pasture", "hay"],
  formulation: "soluble",
  rateLowOz: 16,
  rateHighOz: 32,
  rateUnit: "fl oz/ac (1–2 pt/ac)",
  rate: "1–2 pt/ac",
  grazing: "Do not pasture or mow for hay for 40 days after treatment",
  hay: "40-day cutting restriction",
  manureMonths: 0,
  waterBufferFt: 150,
  tempWindow: "Bermudagrass/bahiagrass FULL dormancy only — contact burndown, non-selective",
  notes: "⚠⚠ Paraquat is acutely lethal in even small ingested amounts, with no antidote — EPA now requires closed-system mixing/loading and certified-applicator handling for most uses. Only use if you're confident in that handling infrastructure; otherwise glyphosate at the same dormant-season timing is a much safer choice for similar results. Non-selective contact herbicide, so any green bermuda tissue it touches will be damaged — full dormancy confirmation is essential before spraying.",
  restrictedUse: true
}, {
  id: "cimarronplus",
  name: "Cimarron Plus (metsulfuron + chlorsulfuron)",
  moa: "2 (ALS inhibitor)",
  targets: ["bahiagrass", "ragweed", "thistle", "horsenettle", "cocklebur", "dock"],
  use: ["pasture", "hay"],
  formulation: "dry",
  rateLowOz: 0.5,
  rateHighOz: 2,
  rateUnit: "oz/ac (dry wt.)",
  rate: "0.5–2 oz/ac (0.375 oz/ac for Pensacola bahiagrass)",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Bahiagrass/broadleaf actively growing",
  notes: "Metsulfuron-family relative of Pastora/Chaparral, aimed more at bahiagrass encroachment and broadleaf cleanup than at johnsongrass. Has soil residual activity — can affect a following alfalfa, clover, or ryegrass planting, so mind rotation timing. Add a surfactant for best performance. Sister products Cimarron Max (adds dicamba + 2,4-D, 2-part mix, 37-day hay restriction) and Cimarron Xtra exist if you need a specific rate structure — check the specific label.",
  restrictedUse: false
}, {
  id: "outrider",
  name: "Outrider (sulfosulfuron)",
  moa: "2",
  targets: ["johnsongrass", "nutsedge", "vaseygrass"],
  use: ["hay", "pasture"],
  formulation: "dry",
  rateLowOz: 1.33,
  rateHighOz: 2.67,
  rateUnit: "oz/ac (dry wt.)",
  rate: "1.33–2.67 oz/ac + NIS",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Johnsongrass in boot to early head stage",
  notes: "Already in your rotation for johnsongrass in hay fields. Same ALS mode of action as Pastora — alternate MOA groups between years to slow resistance.",
  restrictedUse: false
}, {
  id: "msma",
  name: "MSMA (e.g. Target 6 Plus)",
  moa: "17 (Organic arsenical)",
  targets: ["dallisgrass", "crabgrass", "nutsedge"],
  use: ["pasture"],
  formulation: "soluble",
  rateLowOz: 32,
  rateHighOz: 42.7,
  rateUnit: "fl oz/ac (per application; 2 apps 7–10 days apart)",
  rate: "32–42.7 fl oz/ac (2–2.67 pt/ac), 2 apps 7–10 days apart",
  grazing: "Check current label — varies",
  hay: "Check current label — varies",
  manureMonths: 0,
  waterBufferFt: 150,
  tempWindow: "Warm, actively growing dallisgrass, ideally above 70°F",
  notes: "⚠ EPA cancelled most agricultural MSMA registrations years ago with only narrow exceptions remaining (cotton, sod farms, highway ROW, golf courses in some states). Pasture/turf uses have been phased out in most states. Confirm MSMA is still legally labeled for pasture use in Texas before applying. Performs poorly below ~70°F — cold applications underperform without controlling the target weed.",
  restrictedUse: true
}, {
  id: "sedgehammer",
  name: "Sedgehammer (halosulfuron)",
  moa: "2",
  targets: ["nutsedge"],
  use: ["pasture", "hay"],
  formulation: "dry",
  rateLowOz: 1.33,
  rateHighOz: 1.33,
  rateUnit: "oz/ac (dry wt.)",
  rate: "1.33 oz/ac + NIS",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Nutsedge 3–8 leaf stage",
  notes: "Purpose-built for nutsedge, gentle on bermuda.",
  restrictedUse: false
}, {
  id: "chaparral",
  name: "Chaparral (aminopyralid + metsulfuron)",
  moa: "4 + 2",
  targets: ["dewberry", "thistle", "ragweed", "horsenettle", "sericea", "buttercup"],
  use: ["pasture", "hay"],
  formulation: "dry",
  rateLowOz: 2,
  rateHighOz: 3,
  rateUnit: "oz/ac (dry wt.)",
  rate: "2–3 oz/ac",
  grazing: "No restriction",
  hay: "No restriction",
  manureMonths: 18,
  waterBufferFt: 100,
  tempWindow: "Spring, active growth",
  notes: "Broad broadleaf + light brush combo. Same manure/hay carryover caution as GrazonNext/Milestone (aminopyralid component). Contains a Group 2 (metsulfuron) component — don't stack with Pastora, Outrider, or Sedgehammer in the same mix.",
  restrictedUse: false
}, {
  id: "surmount",
  name: "Surmount (picloram + fluroxypyr)",
  moa: "4",
  targets: ["mesquite", "privet", "pricklypear", "dewberry"],
  use: ["pasture"],
  formulation: "soluble",
  rateLowOz: 24,
  rateHighOz: 64,
  rateUnit: "fl oz/ac",
  rate: "24–64 fl oz/ac (1.5–4 pt/ac)",
  grazing: "No restriction for beef",
  hay: "Do not cut for hay",
  manureMonths: 0,
  waterBufferFt: 100,
  tempWindow: "Full leaf-out on brush, warm season",
  notes: "Picloram is a Restricted Use Pesticide in many states and highly soil-persistent — do not use where roots of desirable trees may take it up, and never on hay fields.",
  restrictedUse: true
}];
const SOIL_TYPES = ["Sandy", "Sandy Loam", "Loam", "Clay Loam", "Clay", "Bottomland / Poorly Drained"];
const GRASS_TYPES = ["Common Bermudagrass", "Hybrid Bermudagrass (e.g. Tifton 85)", "Bahiagrass", "Bermuda/Bahia Mix", "Native/Unimproved"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DORMANT_MONTHS = ["November", "December", "January", "February", "March"];

// Herbicides whose safety depends heavily on bermuda's dormancy state, not just the
// weed/soil/season inputs above — these get an extra automatic timing flag.
const TIMING_RULES = {
  glyphosate: {
    requires: "dormant-or-method",
    note: "broadcasting on green, actively growing bermuda"
  },
  paraquat: {
    requires: "dormant",
    note: "any green bermuda tissue it contacts will be damaged"
  },
  pendimethalin: {
    requires: "dormant",
    note: "this is a pre-emergent — it needs bare, dormant ground ahead of weed germination, not green bermuda"
  },
  indaziflam: {
    requires: "dormant",
    note: "pre-emergent — apply ahead of germination on dormant/established turf, not as a postemergence rescue"
  },
  imazapic: {
    requires: "active",
    note: "the label calls for 100% bermudagrass green-up before spraying — applying too early adds injury risk for no control benefit"
  }
};
const uid = () => Math.random().toString(36).slice(2, 10);

// Explicit inline styles for buttons whose color/background must never depend on
// the CSS cascade (Tailwind arbitrary-value classes have proven unreliable for
// this in some rendering surfaces) — always pass these via the style prop, not
// just className, on any button carrying a Save/Cancel/primary-action role.
const BTN_SOLID_STYLE = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#2B4C3F",
  color: "#FFFFFF"
};
const BTN_GHOST_STYLE = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  border: "none",
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "#6B7A5E"
};

// Pure recommendation engine — computes ranked herbicide matches for one field's
// context (weeds present, use type, water proximity, recent application history,
// today's conditions, and month). Called once per selected field so multi-field
// plans get per-field-accurate flags (water buffer, MOA rotation, timing).
function computeRecommendations({
  weeds,
  useType,
  nearWater,
  distToWater,
  applications,
  rainExpected,
  daysSinceRain,
  month
}) {
  if (!weeds || weeds.length === 0) return {
    candidates: [],
    excludedByTiming: []
  };
  const recentMoaGroups = applications.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4).map(a => {
    const h = HERBICIDES.find(h => h.id === a.herbicideId);
    return h ? h.moa : null;
  }).filter(Boolean);
  const excludedByTiming = [];
  const isDormantMonth = DORMANT_MONTHS.includes(month);
  const candidates = HERBICIDES.map(h => {
    const hits = h.targets.filter(t => weeds.includes(t));
    if (hits.length === 0) return null;
    const useOk = useType === "both" ? h.use.includes("pasture") || h.use.includes("hay") : h.use.includes(useType);
    if (!useOk) return null;

    // Hard eligibility gate: a product whose timing prerequisite isn't met this month
    // doesn't get suggested at all (e.g. no broadcast glyphosate in August) — it's
    // excluded here rather than shown with a warning.
    const timing = TIMING_RULES[h.id];
    if (timing) {
      const prereqFailed = timing.requires === "dormant" && !isDormantMonth || timing.requires === "dormant-or-method" && !isDormantMonth || timing.requires === "active" && isDormantMonth;
      if (prereqFailed) {
        excludedByTiming.push({
          id: h.id,
          name: h.name,
          reason: timing.note
        });
        return null;
      }
    }
    const flags = [];
    if (nearWater && distToWater < h.waterBufferFt) {
      flags.push({
        level: "danger",
        text: `Water buffer: label calls for ~${h.waterBufferFt} ft from water; this field's profile has ${distToWater} ft to the lake/pond.`
      });
    }
    if (recentMoaGroups.filter(m => m === h.moa).length >= 2) {
      flags.push({
        level: "warn",
        text: `You've used MOA group ${h.moa} in ${recentMoaGroups.filter(m => m === h.moa).length} of this field's last 4 logged applications — consider rotating to a different mode of action to slow resistance.`
      });
    }
    if (h.restrictedUse) {
      flags.push({
        level: "warn",
        text: "Verify current registration/restricted-use status before applying — this product's labeled uses have shifted in recent years."
      });
    }
    if (h.manureMonths > 0) {
      flags.push({
        level: "warn",
        text: `Aminopyralid carryover: don't give away or sell hay/manure from this field for ~${h.manureMonths} months — it can damage broadleaf crops/gardens wherever it ends up.`
      });
    }
    if (rainExpected) {
      flags.push({
        level: "warn",
        text: "Rain expected — most of these products want 4–6 hrs (some 24 hrs) rain-free after application to avoid wash-off and runoff to the lake."
      });
    }
    if (daysSinceRain !== "" && Number(daysSinceRain) > 21) {
      flags.push({
        level: "info",
        text: "Dry stretch (3+ weeks) — drought-stressed weeds absorb herbicide poorly. Consider waiting for a green-up or dropping the surfactant rate up slightly per label."
      });
    }
    const score = hits.length * 10 - flags.filter(f => f.level === "danger").length * 100 - flags.filter(f => f.level === "warn").length * 2;
    return {
      herbicide: h,
      hits,
      flags,
      score
    };
  }).filter(Boolean);
  candidates.sort((a, b) => b.score - a.score);
  return {
    candidates,
    excludedByTiming
  };
}

/* ============================================================
   TANK MIX RULES ENGINE
   Grounded in: WALES/DALES mixing-order convention (VCE/Sprayers101/UNL
   extension guidance), the general label rule against tank-mixing two
   ALS-inhibitor (Group 2) products together (HSE / EPA label guidance),
   and specific documented combos from Corteva/university pasture-weed
   publications (Arkansas MP522/MP44, GrazonNext HL label). This is a
   planning aid, not a substitute for the specimen label of every
   product in the mix — the label always governs.
   ============================================================ */

const KNOWN_COMBOS = [{
  pair: ["grazonnext", "remedyultra"],
  level: "info",
  text: "GrazonNext HL + Remedy Ultra is a well-documented, picloram-free one-pass broadleaf + brush combo used in university pasture-weed guides."
}, {
  pair: ["grazonnext", "pasturegard"],
  level: "info",
  text: "GrazonNext HL + PastureGard HL is called out on the GrazonNext label itself as an effective tank-mix partner for one-pass weed and brush control."
}, {
  pair: ["chaparral", "pasturegard"],
  level: "info",
  text: "Chaparral + PastureGard HL is a commonly recommended combo for tougher brush like buckbrush."
}, {
  pair: ["grazonnext", "pastora"],
  level: "info",
  text: "GrazonNext HL + Pastora is a labeled, commonly used combination for broader broadleaf + johnsongrass control in hay fields."
}, {
  pair: ["msma", "24d"],
  level: "warn",
  text: "MSMA + 2,4-D is a workable, commonly used combo, but MSMA performs best above ~70°F — a cool-weather application can underperform on the target weed while still stressing the bermuda."
}, {
  pair: ["pastora", "glyphosate"],
  level: "info",
  text: "Pastora + a low rate of glyphosate (roughly 6–8 fl oz/ac of a 4 lb/gal formulation) is a university-documented combo for perennial/regrowth sandbur and vaseygrass that Pastora alone won't fully knock back — it stunts bermuda more than Pastora alone, so time it right after a cutting."
}];
function analyzeTankMix(selected) {
  const flags = [];
  const ids = selected.map(h => h.id);

  // Rule: don't stack two ALS (Group 2) inhibitors in one mix.
  // Match "2" as a standalone group token so MOA "22" (paraquat) doesn't false-match.
  const alsProducts = selected.filter(h => /\b2\b/.test(h.moa));
  if (alsProducts.length >= 2) {
    flags.push({
      level: "danger",
      text: `${alsProducts.map(h => h.name).join(" + ")} are both Group 2 (ALS-inhibitor) products. Labels generally restrict tank-mixing or sequencing two ALS herbicides together, and it stacks resistance-selection pressure on the same site of action. Don't combine these unless a current label explicitly allows it.`
    });
  }

  // Known documented combos (good or cautionary)
  KNOWN_COMBOS.forEach(c => {
    if (c.pair.every(id => ids.includes(id))) flags.push({
      level: c.level,
      text: c.text
    });
  });

  // Glyphosate is non-selective — flag it outside the one documented Pastora combo
  if (ids.includes("glyphosate")) {
    const documented = ids.includes("pastora") && selected.length === 2;
    if (!documented) {
      flags.push({
        level: "danger",
        text: "Glyphosate is non-selective — it will damage or kill bermuda along with whatever else is in this mix, regardless of what else you're tank-mixing it with. Outside the specific Pastora + low-rate-glyphosate combo, adding glyphosate to a mix usually isn't what you want on a stand you're trying to keep."
      });
    }
  }

  // Restricted-use inheritance
  const ru = selected.filter(h => h.restrictedUse);
  if (ru.length > 0) {
    flags.push({
      level: "warn",
      text: `${ru.map(h => h.name).join(", ")} ${ru.length > 1 ? "are" : "is"} restricted-use — verify registration status and applicator licensing before mixing, same as spraying it alone.`
    });
  }

  // Manure/hay carryover inheritance — worst case governs the whole batch
  const carry = selected.filter(h => h.manureMonths > 0);
  if (carry.length > 0) {
    const months = Math.max(...carry.map(h => h.manureMonths));
    flags.push({
      level: "warn",
      text: `${carry.map(h => h.name).join(", ")} carries an aminopyralid hay/manure restriction (~${months} months). Because it's in the mix, the WHOLE batch of hay or manure off this field inherits that restriction — even the parts that came from the other products.`
    });
  }

  // Most restrictive water buffer / grazing / hay govern the mix as a whole
  const buffer = Math.max(...selected.map(h => h.waterBufferFt));

  // Mixing order per WALES/DALES: dry → water-soluble liquid → EC/ester → surfactant
  const order = {
    dry: selected.filter(h => h.formulation === "dry"),
    soluble: selected.filter(h => h.formulation === "soluble"),
    ec: selected.filter(h => h.formulation === "ec")
  };
  return {
    flags,
    buffer,
    order
  };
}

/* ============================================================
   WEED ICONS — hand-drawn SVG pictograms, one per species.
   Fully self-contained (no network calls), so they always render
   regardless of connectivity — unlike hotlinked photos, which the
   artifact sandbox can't reliably fetch.
   ============================================================ */

const TYPE_BG = {
  grass: "#E7EEDB",
  sedge: "#E1EEE7",
  broadleaf: "#F1EBDC",
  brush: "#EBE3D8"
};
const WEED_ICON_PATHS = {
  bahiagrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 24"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 24 L18 10 M32 24 L46 10"
  })),
  goosegrass: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "52",
    rx: "10",
    ry: "4",
    fill: "#EDEAE0",
    stroke: "#8A9080",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 48 L32 20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 L20 10 M32 20 L26 8 M32 20 L32 6 M32 20 L38 8 M32 20 L44 10"
  }))),
  barnyardgrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 22 L20 16 M32 30 L18 26 M32 38 L20 36"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 22 L44 16 M32 30 L46 26 M32 38 L44 36"
  })),
  ryegrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M28 18 L36 18 M28 26 L36 26 M28 34 L36 34 M28 42 L36 42"
  })),
  texaspanicum: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 24"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 24 C24 22 18 26 14 32"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 24 C40 22 46 26 50 32"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 24 L32 10"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#3A4A2E"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "32",
    r: "1.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "32",
    r: "1.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "10",
    r: "1.6"
  }))),
  smutgrass: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 20",
    stroke: "#3A4A2E",
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "30",
    y: "8",
    width: "4",
    height: "14",
    rx: "2",
    fill: "#3A3028"
  })),
  dallisgrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 C26 40 20 28 16 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 58 C32 38 32 24 32 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 58 C38 40 44 28 48 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 12 L10 6 M16 12 L14 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 8 L26 2 M32 8 L38 2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M48 12 L54 6 M48 12 L50 4"
  })),
  johnsongrass: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 C20 18 14 24 10 34"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 C24 16 18 18 14 24"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 C44 18 50 24 54 34"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 C40 16 46 18 50 24"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 L32 6"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#3A4A2E"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "34",
    r: "1.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "24",
    r: "1.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "54",
    cy: "34",
    r: "1.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "24",
    r: "1.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "6",
    r: "1.8"
  }))),
  vaseygrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 22 L20 8 M32 22 L24 6 M32 22 L32 4 M32 22 L40 6 M32 22 L44 8"
  })),
  crabgrass: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 46 L10 40 M32 46 L14 30 M32 46 L24 20 M32 46 L40 20 M32 46 L50 30 M32 46 L54 40 M32 46 L32 58"
  })),
  sandbur: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 30",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "22",
    r: "8",
    fill: "none",
    stroke: "#B9503F",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#B9503F",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M40 22 L46 22 M37.7 16.3 L41.9 10.6 M32 14 L32 8 M26.3 16.3 L22.1 10.6 M24 22 L18 22 M26.3 27.7 L22.1 33.4 M32 30 L32 36 M37.7 27.7 L41.9 33.4"
  }))),
  nutsedge: /*#__PURE__*/React.createElement("g", {
    stroke: "#2F6B52",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L28 24 L36 24 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 24 L14 12 M32 24 L22 8 M32 24 L32 6 M32 24 L42 8 M32 24 L50 12"
  })),
  pigweed: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 44 L20 38 L32 34 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 34 L44 28 L32 24 Z"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M32 20 C26 14 26 6 32 4 C38 6 38 14 32 20 Z",
    fill: "#3A4A2E",
    stroke: "none"
  })),
  ragweed: /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 40 L22 36 M32 40 L20 42 M32 40 L24 46"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 30 L42 26 M32 30 L44 32 M32 30 L40 36"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 14 L30 6 M32 14 L32 4 M32 14 L34 6"
  })),
  horsenettle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 30"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 40 C20 38 16 32 18 24 C24 28 28 30 32 40 Z"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "18",
    r: "6",
    fill: "#7A5A9E"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "18",
    r: "2",
    fill: "#D9A62E"
  })),
  buttercup: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 26",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#D9A62E"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "7",
    rx: "5",
    ry: "9"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "7",
    rx: "5",
    ry: "9",
    transform: "rotate(72 32 16)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "7",
    rx: "5",
    ry: "9",
    transform: "rotate(144 32 16)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "7",
    rx: "5",
    ry: "9",
    transform: "rotate(216 32 16)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "7",
    rx: "5",
    ry: "9",
    transform: "rotate(288 32 16)"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "16",
    r: "3",
    fill: "#8C6A1F"
  })),
  thistle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 26",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "20",
    rx: "8",
    ry: "7",
    fill: "#5B6B4A"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#7A5A9E",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 13 L30 4 M32 13 L32 2 M32 13 L34 4 M28 15 L22 8 M36 15 L42 8"
  }))),
  cocklebur: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L30 40",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "34",
    cy: "26",
    rx: "9",
    ry: "12",
    fill: "none",
    stroke: "#B9503F",
    strokeWidth: "2.4"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#B9503F",
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M25 16 L23 12 M34 14 L34 10 M43 16 L45 12 M25 36 L22 40 M43 36 L46 40"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M18 40 C10 34 10 24 18 20 C22 24 24 30 18 40 Z",
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "2.4"
  })),
  dock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 16",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#8C4A2E"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "14",
    r: "1.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "34",
    cy: "18",
    r: "1.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "20",
    r: "1.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "33",
    cy: "24",
    r: "1.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "26",
    r: "1.7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "34",
    cy: "30",
    r: "1.7"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M20 50 C14 44 16 36 22 34 C26 40 26 46 20 50 Z",
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "2.4"
  })),
  plantain: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 20",
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#3A4A2E"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "20",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "26",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "38",
    r: "1.4"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "#5B6B4A",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 50 C18 48 12 40 14 32 C22 34 30 40 32 50 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 50 C46 48 52 40 50 32 C42 34 34 40 32 50 Z"
  }))),
  sericea: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 8",
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#5B6B4A"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "26",
    cy: "46",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "42",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "38",
    cy: "46",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "26",
    cy: "30",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "26",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "38",
    cy: "30",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "26",
    cy: "16",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "38",
    cy: "16",
    r: "3"
  }))),
  smilax: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 C24 50 20 40 24 30 C28 34 32 38 32 44",
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M34 24 C34 20 30 18 28 20 C24 16 24 10 30 8 C34 10 36 16 34 24 Z",
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "2.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M40 30 C44 28 46 24 44 20 C42 22 40 24 40 28",
    stroke: "#3A4A2E",
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#B9503F",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M24 44 L18 42 M28 50 L22 52"
  }))),
  dewberry: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 C26 46 22 34 26 22",
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#B9503F",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M28 48 L22 46 M25 36 L19 36 M27 26 L21 24"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "2",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M40 20 L36 12 L40 8 L44 12 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M46 22 L42 14 L46 10 L50 14 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M34 26 L30 18 L34 14 L38 18 Z"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#4A2E4A"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "44",
    cy: "30",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "47",
    cy: "33",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "44",
    cy: "36",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "41",
    cy: "33",
    r: "2"
  }))),
  privet: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 14",
    stroke: "#3A4A2E",
    strokeWidth: "2.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#5B6B4A"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "24",
    cy: "46",
    rx: "5",
    ry: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "40",
    cy: "46",
    rx: "5",
    ry: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "24",
    cy: "34",
    rx: "5",
    ry: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "40",
    cy: "34",
    rx: "5",
    ry: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "24",
    cy: "24",
    rx: "5",
    ry: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "40",
    cy: "24",
    rx: "5",
    ry: "3"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#EDEAE0",
    stroke: "#C9C6B8",
    strokeWidth: "0.5"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "28",
    cy: "10",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "8",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "36",
    cy: "10",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "13",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "34",
    cy: "13",
    r: "2.2"
  }))),
  mesquite: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 30",
    stroke: "#3A4A2E",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#3A4A2E",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 34 L14 26 M32 34 L14 34 M32 34 L14 42 M32 34 L50 26 M32 34 L50 34 M32 34 L50 42"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "#8C6A1F",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 46 C20 52 22 58 26 60"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M40 46 C42 52 40 58 36 60"
  }))),
  pricklypear: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ellipse", {
    cx: "26",
    cy: "42",
    rx: "12",
    ry: "16",
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "38",
    cy: "20",
    rx: "11",
    ry: "14",
    fill: "none",
    stroke: "#3A4A2E",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#3A4A2E"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "22",
    cy: "36",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "28",
    cy: "34",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "46",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "48",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "34",
    cy: "16",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "40",
    cy: "14",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "36",
    cy: "24",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "42",
    cy: "22",
    r: "1"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "38",
    cy: "8",
    r: "4",
    fill: "#D9668C"
  }))
};
function WeedIcon({
  id
}) {
  const content = WEED_ICON_PATHS[id];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 64 64",
    className: "w-full h-full"
  }, content || /*#__PURE__*/React.createElement("g", {
    stroke: "#9CA391",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32 58 L32 20 M32 20 C24 20 20 12 22 6 C28 8 32 14 32 20 M32 20 C40 20 44 12 42 6 C36 8 32 14 32 20"
  })));
}

/* ============================================================
   STORAGE HELPERS
   ============================================================ */

async function loadAll() {
  const out = {
    applications: [],
    cuttings: [],
    lastInputs: null,
    fieldProfiles: {}
  };
  try {
    const a = await window.storage.get("spray-planner:applications");
    if (a) out.applications = JSON.parse(a.value);
  } catch (e) {}
  try {
    const c = await window.storage.get("spray-planner:cuttings");
    if (c) out.cuttings = JSON.parse(c.value);
  } catch (e) {}
  try {
    const l = await window.storage.get("spray-planner:last-inputs");
    if (l) out.lastInputs = JSON.parse(l.value);
  } catch (e) {}
  try {
    const f = await window.storage.get("spray-planner:field-profiles");
    if (f) out.fieldProfiles = JSON.parse(f.value);
  } catch (e) {}
  out.sprayerSettings = {
    tankSizeGal: "",
    defaultGpa: 15
  };
  try {
    const s = await window.storage.get("spray-planner:sprayer-settings");
    if (s) out.sprayerSettings = {
      ...out.sprayerSettings,
      ...JSON.parse(s.value)
    };
  } catch (e) {}
  return out;
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */

function Pill({
  active,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? "bg-[#2B4C3F] border-[#2B4C3F] text-white" : "bg-white border-[#D8D9CE] text-[#3A3D33] hover:border-[#2B4C3F]"}`
  }, children);
}
function SectionLabel({
  icon: Icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement(Icon, {
    size: 16,
    className: "text-[#6B7A5E]"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-[#23261F] tracking-wide uppercase text-xs",
    style: {
      letterSpacing: "0.08em"
    }
  }, children));
}

/* ============================================================
   MAIN APP
   ============================================================ */

function SprayPlanner() {
  const [tab, setTab] = useState("plan");
  const [loaded, setLoaded] = useState(false);
  const [applications, setApplications] = useState([]);
  const [cuttings, setCuttings] = useState([]);
  const [fieldProfiles, setFieldProfiles] = useState({});
  const [sprayerSettings, setSprayerSettings] = useState({
    tankSizeGal: "",
    defaultGpa: 15
  });
  const [saveError, setSaveError] = useState(null);

  // Plan wizard state — field selection is now multi-select against saved field
  // profiles; soil/grass/water/acreage come from each profile, not typed here.
  const [selectedFieldNames, setSelectedFieldNames] = useState([]);
  const [selectedWeeds, setSelectedWeeds] = useState([]);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [daysSinceRain, setDaysSinceRain] = useState("");
  const [rainExpected, setRainExpected] = useState(false);
  const [recentTemp, setRecentTemp] = useState("");
  const [weedSearch, setWeedSearch] = useState("");
  useEffect(() => {
    (async () => {
      const data = await loadAll();
      setApplications(data.applications);
      setCuttings(data.cuttings);
      setFieldProfiles(data.fieldProfiles || {});
      setSprayerSettings(data.sprayerSettings);
      if (data.lastInputs) {
        const li = data.lastInputs;
        setSelectedFieldNames(li.selectedFieldNames ?? []);
        setSelectedWeeds(li.selectedWeeds ?? []);
        setMonth(li.month ?? MONTHS[new Date().getMonth()]);
        setDaysSinceRain(li.daysSinceRain ?? "");
        setRainExpected(li.rainExpected ?? false);
        setRecentTemp(li.recentTemp ?? "");
      }
      setLoaded(true);
    })();
  }, []);
  const persist = useCallback(async (key, value) => {
    try {
      const res = await window.storage.set(key, JSON.stringify(value), false);
      if (!res) setSaveError("Save didn't go through — your data may not persist.");else setSaveError(null);
    } catch (e) {
      setSaveError("Save failed — your data may not persist this session.");
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const inputs = {
      selectedFieldNames,
      selectedWeeds,
      month,
      daysSinceRain,
      rainExpected,
      recentTemp
    };
    persist("spray-planner:last-inputs", inputs);
  }, [loaded, selectedFieldNames, selectedWeeds, month, daysSinceRain, rainExpected, recentTemp, persist]);
  async function updateSprayerSettings(patch) {
    const next = {
      ...sprayerSettings,
      ...patch
    };
    setSprayerSettings(next);
    await persist("spray-planner:sprayer-settings", next);
  }
  function toggleWeed(id) {
    setSelectedWeeds(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  }
  function toggleField(name) {
    setSelectedFieldNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }
  async function addApplication(entry) {
    const next = [{
      ...entry,
      id: uid()
    }, ...applications];
    setApplications(next);
    await persist("spray-planner:applications", next);
  }
  // Adds several application entries in one atomic update — required for anything
  // that logs more than one entry at once (e.g. a multi-field, multi-product spray
  // plan), since calling addApplication repeatedly in a loop would have each call
  // overwrite the previous one (they'd all read the same stale `applications`).
  async function addApplications(entries) {
    if (!entries || entries.length === 0) return;
    const withIds = entries.map(e => ({
      ...e,
      id: uid()
    }));
    const next = [...withIds, ...applications];
    setApplications(next);
    await persist("spray-planner:applications", next);
  }
  async function removeApplication(id) {
    const next = applications.filter(a => a.id !== id);
    setApplications(next);
    await persist("spray-planner:applications", next);
  }
  async function addCutting(entry) {
    const next = [{
      ...entry,
      id: uid()
    }, ...cuttings];
    setCuttings(next);
    await persist("spray-planner:cuttings", next);
  }
  async function removeCutting(id) {
    const next = cuttings.filter(c => c.id !== id);
    setCuttings(next);
    await persist("spray-planner:cuttings", next);
  }

  // Every known field name — from saved profiles and from past logs — for the
  // search/dropdown (datalist) on every field-name input in the app.
  const knownFieldNames = useMemo(() => {
    const names = new Set();
    Object.keys(fieldProfiles || {}).forEach(n => names.add(n));
    applications.forEach(a => a.field && names.add(a.field));
    cuttings.forEach(c => c.field && names.add(c.field));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [fieldProfiles, applications, cuttings]);

  // Field profiles: soil/grass/water context remembered per field, keyed by trimmed name.
  async function upsertFieldProfile(name, patch) {
    const key = (name || "").trim();
    if (!key) return;
    const next = {
      ...fieldProfiles,
      [key]: {
        ...(fieldProfiles[key] || {}),
        ...patch,
        updatedAt: new Date().toISOString().slice(0, 10)
      }
    };
    setFieldProfiles(next);
    await persist("spray-planner:field-profiles", next);
  }
  async function deleteFieldProfile(name) {
    const next = {
      ...fieldProfiles
    };
    delete next[name];
    setFieldProfiles(next);
    await persist("spray-planner:field-profiles", next);
  }

  // ---- Per-field recommendation plans for every selected field ----
  const fieldPlans = useMemo(() => {
    return selectedFieldNames.map(name => {
      const profile = fieldProfiles[name] || {};
      const fieldApps = applications.filter(a => a.field === name);
      const {
        candidates,
        excludedByTiming
      } = computeRecommendations({
        weeds: selectedWeeds,
        useType: profile.useType || "pasture",
        nearWater: profile.nearWater ?? true,
        distToWater: profile.distToWater ?? 150,
        applications: fieldApps,
        rainExpected,
        daysSinceRain,
        month
      });
      return {
        name,
        profile,
        recommendations: candidates,
        excludedByTiming
      };
    });
  }, [selectedFieldNames, fieldProfiles, applications, selectedWeeds, rainExpected, daysSinceRain, month]);
  const filteredWeeds = WEEDS.filter(w => w.name.toLowerCase().includes(weedSearch.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen",
    style: {
      background: "#F2F3EE",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#23261F"
    }
  }, /*#__PURE__*/React.createElement("datalist", {
    id: "known-field-names"
  }, knownFieldNames.map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }))), /*#__PURE__*/React.createElement("style", null, `
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .display { font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.01em; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .ticket { position: relative; }
        .ticket::before, .ticket::after {
          content: ""; position: absolute; width: 16px; height: 16px; border-radius: 50%;
          background: #F2F3EE; top: 50%; transform: translateY(-50%);
        }
        .ticket::before { left: -8px; }
        .ticket::after { right: -8px; }
        input[type="text"], input[type="number"], select {
          background: white; border: 1px solid #D8D9CE; border-radius: 8px; padding: 8px 10px;
          font-size: 14px; color: #23261F; width: 100%;
        }
        input:focus, select:focus { outline: 2px solid #6B7A5E; outline-offset: 1px; }
        button { appearance: none; -webkit-appearance: none; -moz-appearance: none; color-scheme: light; }
      `), /*#__PURE__*/React.createElement("header", {
    className: "border-b",
    style: {
      borderColor: "#D8D9CE",
      background: "#23261F"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto px-4 py-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded flex items-center justify-center",
    style: {
      background: "#6B7A5E"
    }
  }, /*#__PURE__*/React.createElement(Droplets, {
    size: 18,
    color: "white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "display text-white text-xl font-bold leading-none"
  }, "SPRAY TICKET"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-widest text-[#9CA391]"
  }, "Pasture Chemical Planner"))), saveError && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#E8B84B] flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 13
  }), " ", saveError)), /*#__PURE__*/React.createElement("nav", {
    className: "max-w-5xl mx-auto px-4 pb-2",
    style: {
      display: "flex",
      gap: 4,
      overflowX: "auto"
    }
  }, [{
    id: "plan",
    label: "Plan",
    icon: Droplets
  }, {
    id: "fields",
    label: "Fields",
    icon: MapPin
  }, {
    id: "log",
    label: "Sprays",
    icon: ClipboardList
  }, {
    id: "cutting",
    label: "Cuttings",
    icon: Scissors
  }, {
    id: "reference",
    label: "Reference",
    icon: BookOpen
  }].map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      colorScheme: "light",
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: "6px 6px 0 0",
      flexShrink: 0,
      whiteSpace: "nowrap",
      border: "none",
      outline: "none",
      cursor: "pointer",
      backgroundColor: tab === t.id ? "#F2F3EE" : "#23261F",
      color: tab === t.id ? "#23261F" : "#D8DACE",
      fontWeight: tab === t.id ? 600 : 400
    }
  }, /*#__PURE__*/React.createElement(t.icon, {
    size: 14,
    color: tab === t.id ? "#23261F" : "#D8DACE"
  }), t.label)))), /*#__PURE__*/React.createElement("main", {
    className: "max-w-5xl mx-auto px-4 py-6"
  }, tab === "plan" && /*#__PURE__*/React.createElement(PlanTab, {
    fieldProfiles,
    selectedFieldNames,
    toggleField,
    selectedWeeds,
    toggleWeed,
    weedSearch,
    setWeedSearch,
    filteredWeeds,
    month,
    setMonth,
    daysSinceRain,
    setDaysSinceRain,
    rainExpected,
    setRainExpected,
    recentTemp,
    setRecentTemp,
    fieldPlans,
    addApplications,
    sprayerSettings,
    updateSprayerSettings
  }), tab === "fields" && /*#__PURE__*/React.createElement(FieldsTab, {
    applications: applications,
    cuttings: cuttings,
    fieldProfiles: fieldProfiles,
    onUpsert: upsertFieldProfile,
    onDelete: deleteFieldProfile
  }), tab === "log" && /*#__PURE__*/React.createElement(LogTab, {
    applications: applications,
    onAdd: addApplication,
    onRemove: removeApplication
  }), tab === "cutting" && /*#__PURE__*/React.createElement(CuttingTab, {
    cuttings: cuttings,
    onAdd: addCutting,
    onRemove: removeCutting
  }), tab === "reference" && /*#__PURE__*/React.createElement(ReferenceTab, null)), /*#__PURE__*/React.createElement("footer", {
    className: "max-w-5xl mx-auto px-4 pb-10 pt-4 text-xs text-[#6B7A5E] leading-relaxed"
  }, "This tool is a planning aid built from general pasture-herbicide knowledge — it is not a substitute for the current product label, which is the legal application document, or for your county extension agent / a licensed applicator. Labels, restricted-use status, and grazing/haying restrictions change — verify before every application, especially near your lake frontage."));
}

/* ============================================================
   PLAN TAB
   ============================================================ */

function PlanTab(props) {
  const {
    fieldProfiles,
    selectedFieldNames,
    toggleField,
    selectedWeeds,
    toggleWeed,
    weedSearch,
    setWeedSearch,
    filteredWeeds,
    month,
    setMonth,
    daysSinceRain,
    setDaysSinceRain,
    rainExpected,
    setRainExpected,
    recentTemp,
    setRecentTemp,
    fieldPlans,
    addApplications,
    sprayerSettings,
    updateSprayerSettings
  } = props;
  const fieldNames = Object.keys(fieldProfiles).sort((a, b) => a.localeCompare(b));
  const readyForPlan = selectedFieldNames.length > 0 && selectedWeeds.length > 0;

  // Per-field product picks feeding the single combined Spray Plan section below.
  const [planSelections, setPlanSelections] = useState({}); // { [fieldName]: herbicideId[] }
  function toggleProduct(fieldName, herbicideId) {
    setPlanSelections(prev => {
      const cur = prev[fieldName] || [];
      const next = cur.includes(herbicideId) ? cur.filter(x => x !== herbicideId) : [...cur, herbicideId];
      return {
        ...prev,
        [fieldName]: next
      };
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: MapPin
  }, "Select Field(s) to Spray"), fieldNames.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-[#6B7A5E]"
  }, "No saved fields yet. Add one on the Fields tab — soil, grass type, water distance, and acreage live there, and this screen pulls from it automatically once it exists.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, fieldNames.map(name => {
    const p = fieldProfiles[name] || {};
    const active = selectedFieldNames.includes(name);
    return /*#__PURE__*/React.createElement("button", {
      key: name,
      onClick: () => toggleField(name),
      className: `text-left rounded-lg border-2 p-3 transition-colors ${active ? "border-[#2B4C3F] bg-[#EAF0E6]" : "border-[#D8D9CE] bg-white hover:border-[#B9BFAE]"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-sm flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(MapPin, {
      size: 13,
      className: "text-[#6B7A5E] shrink-0"
    }), " ", name), active && /*#__PURE__*/React.createElement(Check, {
      size: 14,
      className: "text-[#2B4C3F] shrink-0"
    })), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-[#8A9080] mt-1"
    }, p.acreage ? `${p.acreage} ac · ` : "acreage not set · ", p.soil || "soil not set", " · ", p.grass || "grass not set"), p.nearWater && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] mono px-1.5 py-0.5 rounded bg-[#E9F0F7] text-[#2F5C7A] inline-flex items-center gap-1 mt-1.5"
    }, /*#__PURE__*/React.createElement(Waves, {
      size: 10
    }), " ", p.distToWater ?? "?", " ft to water"));
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#9CA391] mt-2"
  }, "Select as many as you're spraying today — you'll get one combined plan below, broken out per field."))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: Sprout
  }, "Weeds Present"), /*#__PURE__*/React.createElement("div", {
    className: "relative mb-3"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 14,
    className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B9BFAE]"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: weedSearch,
    onChange: e => setWeedSearch(e.target.value),
    placeholder: "Search weed species…",
    className: "pl-8"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
  }, filteredWeeds.map(w => {
    const active = selectedWeeds.includes(w.id);
    return /*#__PURE__*/React.createElement("button", {
      key: w.id,
      onClick: () => toggleWeed(w.id),
      className: `text-left rounded-lg overflow-hidden border-2 transition-colors bg-white ${active ? "border-[#2B4C3F]" : "border-transparent hover:border-[#D8D9CE]"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-20 w-full relative",
      style: {
        background: TYPE_BG[w.type] || "#EFF1E8"
      }
    }, /*#__PURE__*/React.createElement(WeedIcon, {
      id: w.id
    }), active && /*#__PURE__*/React.createElement("div", {
      className: "absolute top-1.5 right-1.5 bg-[#2B4C3F] rounded-full p-1 shadow"
    }, /*#__PURE__*/React.createElement(Check, {
      size: 11,
      color: "white"
    }))), /*#__PURE__*/React.createElement("div", {
      className: `px-2 py-1.5 text-xs font-medium leading-snug ${active ? "bg-[#EAF0E6] text-[#2B4C3F]" : "text-[#3A3D33]"}`
    }, w.name));
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#9CA391] mt-2"
  }, "Illustrated for quick visual scanning — for a hands-on ID confirmation on a tricky one, snap a photo and check it against your county extension office's weed ID guide. This selection applies to every field checked above.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: CloudRain
  }, "Today's Conditions"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-[#6B7A5E] mb-1 block"
  }, "Month"), /*#__PURE__*/React.createElement("select", {
    value: month,
    onChange: e => setMonth(e.target.value)
  }, MONTHS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-[#6B7A5E] mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Thermometer, {
    size: 12
  }), " Recent high temp (°F)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: recentTemp,
    onChange: e => setRecentTemp(e.target.value),
    placeholder: "e.g. 88"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-[#6B7A5E] mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(CloudRain, {
    size: 12
  }), " Days since last rain"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: daysSinceRain,
    onChange: e => setDaysSinceRain(e.target.value),
    placeholder: "e.g. 5"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-sm self-end pb-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: rainExpected,
    onChange: e => setRainExpected(e.target.checked),
    className: "w-4 h-4"
  }), "Rain in forecast within 24 hrs")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#8A9080] leading-snug mt-2"
  }, "This tool doesn't pull live weather — punch in what you're seeing off your weather app, and it'll factor into every field's flags below. Soil, grass type, and water distance now come from each field's saved profile — edit those on the Fields tab.")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: Droplets
  }, "Sprayer Setup"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-[#6B7A5E] mb-1 block"
  }, "Tank size (gal)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: sprayerSettings.tankSizeGal,
    onChange: e => updateSprayerSettings({
      tankSizeGal: e.target.value
    }),
    placeholder: "e.g. 500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-[#6B7A5E] mb-1 block"
  }, "Default spray volume (GPA)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: sprayerSettings.defaultGpa,
    onChange: e => updateSprayerSettings({
      defaultGpa: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#9CA391] mt-2"
  }, "Ground-broadcast pasture herbicides are typically applied at 10–20 GPA — 15 is a reasonable starting point, but your product labels may call for a specific range. Both of these remember your RoGator's setup between visits and feed the Spray Plan's water calculation below.")), !readyForPlan ? /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#6B7A5E] bg-white rounded-xl border border-dashed border-[#D8D9CE] p-6 text-center"
  }, "Select at least one field and the weeds present to generate a plan.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: ClipboardList
  }, fieldPlans.length > 1 ? `Field Recommendations — ${fieldPlans.length} Fields` : "Field Recommendations"), fieldPlans.map(fp => /*#__PURE__*/React.createElement(FieldPlanSection, {
    key: fp.name,
    fieldPlan: fp,
    defaultOpen: fieldPlans.length <= 2,
    selection: planSelections[fp.name] || [],
    onToggleProduct: hid => toggleProduct(fp.name, hid)
  })), /*#__PURE__*/React.createElement(SprayPlanSection, {
    fieldPlans: fieldPlans,
    planSelections: planSelections,
    sprayerSettings: sprayerSettings,
    addApplications: addApplications,
    selectedWeeds: selectedWeeds
  })));
}

/* ============================================================
   FIELD PLAN SECTION — one field's recommendations, inside the
   (possibly multi-field) plan. Checking a product here adds it
   to the combined Spray Plan section, not a per-card log.
   ============================================================ */

function FieldPlanSection({
  fieldPlan,
  defaultOpen,
  selection,
  onToggleProduct
}) {
  const {
    name,
    profile,
    recommendations,
    excludedByTiming
  } = fieldPlan;
  const [open, setOpen] = useState(defaultOpen);
  const acresNum = Number(profile.acreage) > 0 ? Number(profile.acreage) : 0;
  const useType = profile.useType || "pasture";
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border-2 border-[#D8D9CE] overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full flex items-center justify-between px-4 py-3 text-left",
    style: {
      background: "#F7F8F3"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MapPin, {
    size: 16,
    className: "text-[#6B7A5E]"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "display font-bold text-base leading-tight"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-[#8A9080]"
  }, acresNum ? `${acresNum} ac · ` : "acreage not set · ", profile.soil || "soil not set", " · ", profile.grass || "grass not set", profile.nearWater ? ` · ${profile.distToWater ?? "?"} ft to water` : "", " · ", recommendations.length, " match", recommendations.length !== 1 ? "es" : "", selection.length > 0 ? ` · ${selection.length} picked` : ""))), /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16,
    className: `text-[#B9BFAE] transition-transform ${open ? "rotate-90" : ""}`
  })), open && /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-3"
  }, excludedByTiming && excludedByTiming.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[#9CA391] italic"
  }, "Not eligible this month: ", excludedByTiming.map(e => e.name).join(", "), " — timing prerequisites aren't met (see Reference Library for details, or change the month above if that's not accurate)."), recommendations.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#6B7A5E] bg-[#F7F8F3] rounded-lg p-4 text-center"
  }, "No product in this reference set matches that combination for this field's use (", useType, "). Check the Reference Library for a wider list, or a licensed applicator can help with edge cases.") : recommendations.map(({
    herbicide: h,
    hits,
    flags
  }) => {
    const picked = selection.includes(h.id);
    return /*#__PURE__*/React.createElement("div", {
      key: h.id,
      className: `ticket bg-white rounded-lg border-2 p-4 ${picked ? "border-[#2B4C3F]" : "border-dashed border-[#D8D9CE]"}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3 mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: picked,
      onChange: () => onToggleProduct(h.id),
      className: "w-4 h-4 mt-1",
      title: "Add to spray plan"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "display text-lg font-bold leading-tight"
    }, h.name), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] mono text-[#8A9080]"
    }, "MOA GROUP ", h.moa))), /*#__PURE__*/React.createElement("span", {
      className: "mono text-[10px] px-2 py-1 rounded bg-[#EFF1E8] text-[#3A3D33] whitespace-nowrap"
    }, hits.length, " weed match", hits.length > 1 ? "es" : "")), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-[#3A3D33] mb-2 mono space-y-0.5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Rate:"), " ", h.rateLowOz === h.rateHighOz ? h.rateLowOz : `${h.rateLowOz}–${h.rateHighOz}`, " ", h.rateUnit, acresNum > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-[#6B7A5E]"
    }, " ", "· ", /*#__PURE__*/React.createElement("b", null, "Total for ", acresNum, " ac:"), " ", h.rateLowOz === h.rateHighOz ? `${(h.rateLowOz * acresNum).toFixed(1)} oz` : `${(h.rateLowOz * acresNum).toFixed(1)}–${(h.rateHighOz * acresNum).toFixed(1)} oz`)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-x-4"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Grazing:"), " ", h.grazing), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Hay:"), " ", h.hay))), acresNum === 0 && /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-[#B98A3F] mb-2"
    }, "Set this field's acreage on the Fields tab to see total ounces needed."), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-[#6B7A5E] mb-2"
    }, "Targets here: ", hits.map(id => WEEDS.find(w => w.id === id)?.name).join(", ")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-[#3A3D33] mb-2"
    }, h.notes), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-[#6B7A5E]"
    }, "Window: ", h.tempWindow), flags.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5 mt-3"
    }, flags.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `text-xs rounded px-2.5 py-1.5 flex items-start gap-1.5 ${f.level === "danger" ? "bg-[#FBEAE6] text-[#8C2E1F]" : f.level === "warn" ? "bg-[#FCF3DC] text-[#7A5A12]" : "bg-[#EAF0E6] text-[#3F5A34]"}`
    }, /*#__PURE__*/React.createElement(AlertTriangle, {
      size: 13,
      className: "mt-0.5 shrink-0"
    }), /*#__PURE__*/React.createElement("span", null, f.text)))));
  })));
}

/* ============================================================
   SPRAY PLAN SECTION — the one consolidated, actionable summary:
   fields + total acreage + weeds matched to picked products +
   quantities to mix + total water + a fill order tailored to
   whatever's actually picked, plus a single one-click log action.
   ============================================================ */

function SprayPlanSection({
  fieldPlans,
  planSelections,
  sprayerSettings,
  addApplications,
  selectedWeeds
}) {
  const [gpa, setGpa] = useState(String(sprayerSettings.defaultGpa || 15));
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loggedInfo, setLoggedInfo] = useState(null);
  const [logging, setLogging] = useState(false);
  useEffect(() => {
    setGpa(String(sprayerSettings.defaultGpa || 15));
  }, [sprayerSettings.defaultGpa]);
  useEffect(() => {
    setLoggedInfo(null);
  }, [planSelections, logDate]);
  const activeFields = fieldPlans.filter(fp => (planSelections[fp.name] || []).length > 0);
  const unpickedFields = fieldPlans.filter(fp => (planSelections[fp.name] || []).length === 0);
  const totalAcres = activeFields.reduce((sum, fp) => {
    const a = Number(fp.profile.acreage) > 0 ? Number(fp.profile.acreage) : 0;
    return sum + a;
  }, 0);

  // Aggregate quantities per product across every field it was picked for.
  const productMap = {};
  activeFields.forEach(fp => {
    const acres = Number(fp.profile.acreage) > 0 ? Number(fp.profile.acreage) : 0;
    (planSelections[fp.name] || []).forEach(hid => {
      const h = HERBICIDES.find(x => x.id === hid);
      if (!h) return;
      if (!productMap[hid]) productMap[hid] = {
        herbicide: h,
        fields: [],
        lowOz: 0,
        highOz: 0,
        midOz: 0,
        missingAcreage: false
      };
      productMap[hid].fields.push(fp.name);
      if (acres > 0) {
        productMap[hid].lowOz += h.rateLowOz * acres;
        productMap[hid].highOz += h.rateHighOz * acres;
        productMap[hid].midOz += (h.rateLowOz + h.rateHighOz) / 2 * acres;
      } else {
        productMap[hid].missingAcreage = true;
      }
    });
  });
  const products = Object.values(productMap);
  const selectedHerbicides = products.map(p => p.herbicide);
  const weedCoverage = selectedWeeds.map(wid => {
    const weed = WEEDS.find(w => w.id === wid);
    const matched = selectedHerbicides.filter(h => h.targets.includes(wid));
    return {
      weed,
      matched
    };
  });
  const analysis = selectedHerbicides.length >= 1 ? analyzeTankMix(selectedHerbicides) : null;
  const gpaNum = Number(gpa) || 0;
  const tankSize = Number(sprayerSettings.tankSizeGal) || 0;
  const totalSprayVolumeGal = totalAcres > 0 && gpaNum > 0 ? totalAcres * gpaNum : 0;
  const liquidVolumeGal = products.reduce((sum, p) => p.herbicide.formulation === "dry" ? sum : sum + p.midOz / 128, 0);
  const dryList = products.filter(p => p.herbicide.formulation === "dry").map(p => ({
    name: p.herbicide.name,
    oz: p.midOz.toFixed(1)
  }));
  const waterGal = totalSprayVolumeGal - liquidVolumeGal;
  const loadsNeeded = tankSize > 0 && totalSprayVolumeGal > 0 ? Math.ceil(totalSprayVolumeGal / tankSize) : 1;
  async function logSpray() {
    // Build every field+product entry first, then write them in a single batch —
    // logging them one at a time would each overwrite the last (see addApplications).
    const entries = [];
    for (const fp of activeFields) {
      const ids = planSelections[fp.name] || [];
      for (const hid of ids) {
        const h = HERBICIDES.find(x => x.id === hid);
        if (!h) continue;
        entries.push({
          date: logDate,
          field: fp.name,
          herbicideId: h.id,
          herbicideName: h.name,
          rate: h.rate,
          weeds: selectedWeeds,
          useType: fp.profile.useType || "pasture"
        });
      }
    }
    setLogging(true);
    await addApplications(entries);
    setLogging(false);
    const fieldCount = new Set(entries.map(e => e.field)).size;
    setLoggedInfo(`Logged ${entries.length} application${entries.length !== 1 ? "s" : ""} across ${fieldCount} field${fieldCount !== 1 ? "s" : ""} on ${logDate}.`);
  }
  if (products.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl border-2 border-dashed border-[#D8D9CE] p-6 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-[#6B7A5E]"
    }, "Check the products you'll actually use on the field cards above to build your Spray Plan."));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border-2 border-[#2B4C3F] p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 16,
    className: "text-[#2B4C3F]"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-sm uppercase tracking-wide text-[#2B4C3F]",
    style: {
      letterSpacing: "0.06em"
    }
  }, "Spray Plan")), analysis && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-1.5"
  }, "Compatibility"), analysis.flags.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs rounded px-2.5 py-1.5 bg-[#EAF0E6] text-[#3F5A34] flex items-start gap-1.5"
  }, /*#__PURE__*/React.createElement(Check, {
    size: 13,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, "No documented conflicts among these picks — still jar-test before a full batch.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, analysis.flags.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `text-xs rounded px-2.5 py-1.5 flex items-start gap-1.5 ${f.level === "danger" ? "bg-[#FBEAE6] text-[#8C2E1F]" : f.level === "warn" ? "bg-[#FCF3DC] text-[#7A5A12]" : "bg-[#EAF0E6] text-[#3F5A34]"}`
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 13,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, f.text))))), unpickedFields.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-xs rounded px-2.5 py-1.5 bg-[#FCF3DC] text-[#7A5A12] flex items-start gap-1.5"
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 13,
    className: "mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, unpickedFields.map(fp => fp.name).join(", ")), " ", unpickedFields.length > 1 ? "are" : "is", " selected above but ", unpickedFields.length > 1 ? "have" : "has", " no product checked yet, so", " ", unpickedFields.length > 1 ? "they aren't" : "it isn't", " included in the totals below. Check a product on", " ", unpickedFields.length > 1 ? "those field cards" : "that field's card", " to add ", unpickedFields.length > 1 ? "them" : "it", " in.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#F7F8F3] rounded-lg p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase text-[#8A9080]"
  }, "Fields"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold mono"
  }, activeFields.length)), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#F7F8F3] rounded-lg p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase text-[#8A9080]"
  }, "Total Acreage"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold mono"
  }, totalAcres || "—", " ac")), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#F7F8F3] rounded-lg p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase text-[#8A9080]"
  }, "Products"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold mono"
  }, products.length)), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#F7F8F3] rounded-lg p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase text-[#8A9080]"
  }, "Weeds Covered"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold mono"
  }, weedCoverage.filter(w => w.matched.length > 0).length, "/", weedCoverage.length))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#6B7A5E] mono"
  }, /*#__PURE__*/React.createElement("b", null, "Fields in this plan:"), " ", activeFields.map(fp => `${fp.name} (${fp.profile.acreage || "?"} ac)`).join(", ")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-1.5"
  }, "Weeds Targeted"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, weedCoverage.map(({
    weed,
    matched
  }) => /*#__PURE__*/React.createElement("div", {
    key: weed.id,
    className: "text-xs flex items-start gap-1.5"
  }, matched.length > 0 ? /*#__PURE__*/React.createElement(Check, {
    size: 12,
    className: "text-[#2B4C3F] mt-0.5 shrink-0"
  }) : /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 12,
    className: "text-[#B98A3F] mt-0.5 shrink-0"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, weed.name, ":"), " ", matched.length > 0 ? matched.map(h => h.name).join(", ") : "not covered by your current picks"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-1.5"
  }, "Quantities to Mix"), /*#__PURE__*/React.createElement("table", {
    className: "w-full text-sm mono"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-left text-[10px] uppercase text-[#8A9080] border-b border-[#EFF1E8]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 pr-2"
  }, "Product"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 pr-2"
  }, "Fields"), /*#__PURE__*/React.createElement("th", {
    className: "py-1.5 pr-2"
  }, "Total"))), /*#__PURE__*/React.createElement("tbody", null, products.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.herbicide.id,
    className: "border-b border-[#F2F3EE] align-top"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 pr-2"
  }, p.herbicide.name), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 pr-2 text-[#8A9080] text-xs"
  }, p.fields.join(", ")), /*#__PURE__*/React.createElement("td", {
    className: "py-1.5 pr-2"
  }, p.lowOz === p.highOz ? `${p.lowOz.toFixed(1)} oz` : `${p.lowOz.toFixed(1)}–${p.highOz.toFixed(1)} oz`, p.missingAcreage && /*#__PURE__*/React.createElement("span", {
    className: "text-[#B98A3F]"
  }, " (partial — some fields missing acreage)"))))))), analysis && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-1.5"
  }, "Fill Order (WALES/DALES)"), /*#__PURE__*/React.createElement("ol", {
    className: "text-xs text-[#3A3D33] space-y-1 list-decimal list-inside mono"
  }, /*#__PURE__*/React.createElement("li", null, "Fill tank ~1/3 to 1/2 full with water, start agitation."), analysis.order.dry.length > 0 && /*#__PURE__*/React.createElement("li", null, "Add dry/WDG products, agitate between each: ", analysis.order.dry.map(h => h.name).join(", "), "."), analysis.order.soluble.length > 0 && /*#__PURE__*/React.createElement("li", null, "Add water-soluble liquids, agitate: ", analysis.order.soluble.map(h => h.name).join(", "), "."), analysis.order.ec.length > 0 && /*#__PURE__*/React.createElement("li", null, "Add emulsifiable concentrate/ester products, agitate: ", analysis.order.ec.map(h => h.name).join(", "), "."), /*#__PURE__*/React.createElement("li", null, "Add any required surfactant/NIS per label last."), /*#__PURE__*/React.createElement("li", null, "Top off with remaining water to total volume; keep agitating until and during spraying."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-1.5"
  }, "Water to Add"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-[#6B7A5E] block"
  }, "Spray volume (GPA)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: gpa,
    onChange: e => setGpa(e.target.value),
    className: "w-24"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-[#8A9080] pb-2"
  }, "for ", totalAcres || "—", " ac total")), totalAcres === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[#B98A3F]"
  }, "Set acreage on the selected fields' profiles to calculate water volume.") : /*#__PURE__*/React.createElement("div", {
    className: "mono text-sm text-[#3A3D33] space-y-1 bg-[#F7F8F3] rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", null, "Total spray volume: ", /*#__PURE__*/React.createElement("b", null, totalSprayVolumeGal.toFixed(1), " gal"), " (", gpaNum, " GPA × ", totalAcres, " ac)"), /*#__PURE__*/React.createElement("div", null, "Liquid product volume: ", /*#__PURE__*/React.createElement("b", null, liquidVolumeGal.toFixed(2), " gal")), dryList.length > 0 && /*#__PURE__*/React.createElement("div", null, "Dry product (dissolves in, negligible volume): ", dryList.map(d => `${d.name} ${d.oz} oz`).join("; ")), /*#__PURE__*/React.createElement("div", {
    className: waterGal < 0 ? "text-[#8C2E1F]" : ""
  }, "Water to add: ", /*#__PURE__*/React.createElement("b", null, waterGal < 0 ? "—" : waterGal.toFixed(1) + " gal"), waterGal < 0 && " — your GPA is too low to hold this much product; raise GPA."), tankSize > 0 && /*#__PURE__*/React.createElement("div", {
    className: "pt-1 border-t border-[#E5E7DC] mt-1"
  }, loadsNeeded > 1 ? /*#__PURE__*/React.createElement(React.Fragment, null, "This exceeds your ", tankSize, "-gal tank — you'll need ", /*#__PURE__*/React.createElement("b", null, loadsNeeded, " tank loads"), ", about ", (totalSprayVolumeGal / loadsNeeded).toFixed(0), " gal of finished mix each.") : /*#__PURE__*/React.createElement(React.Fragment, null, "Fits in one ", tankSize, "-gal tank load."))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[#9CA391] mt-2"
  }, "Assumes one combined tank batch covering every field checked above. Rates use the midpoint of each product's range for this estimate — dial in the exact rate per the current label, and jar-test any new combination before a full batch.")), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-[#EFF1E8] space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[10px] text-[#6B7A5E] block"
  }, "Date sprayed"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: logDate,
    onChange: e => setLogDate(e.target.value),
    className: "w-32"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: logSpray,
    disabled: logging,
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      border: "none",
      cursor: logging ? "default" : "pointer",
      backgroundColor: "#2B4C3F",
      color: "#FFFFFF",
      padding: "10px 16px",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      opacity: logging ? 0.7 : 1
    }
  }, /*#__PURE__*/React.createElement(Check, {
    size: 14,
    color: "#FFFFFF"
  }), " ", logging ? "Logging…" : "Log This Spray Plan")), loggedInfo && /*#__PURE__*/React.createElement("div", {
    className: "text-xs rounded px-2.5 py-2 bg-[#EAF0E6] text-[#2B4C3F] flex items-center gap-1.5 font-medium"
  }, /*#__PURE__*/React.createElement(Check, {
    size: 14,
    className: "shrink-0"
  }), " ", loggedInfo)));
}

/* ============================================================
   APPLICATION LOG TAB
   ============================================================ */

function LogTab({
  applications,
  onAdd,
  onRemove
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    field: "",
    herbicideId: HERBICIDES[0].id,
    rate: ""
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: Plus
  }, "Add Past Application"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Date (YYYY-MM-DD)",
    value: form.date,
    onChange: e => setForm({
      ...form,
      date: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Field name",
    value: form.field,
    onChange: e => setForm({
      ...form,
      field: e.target.value
    }),
    list: "known-field-names"
  }), /*#__PURE__*/React.createElement("select", {
    value: form.herbicideId,
    onChange: e => setForm({
      ...form,
      herbicideId: e.target.value
    })
  }, HERBICIDES.map(h => /*#__PURE__*/React.createElement("option", {
    key: h.id,
    value: h.id
  }, h.name))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Rate used",
    value: form.rate,
    onChange: e => setForm({
      ...form,
      rate: e.target.value
    })
  })), /*#__PURE__*/React.createElement("button", {
    className: "mt-3 px-4 py-2 rounded text-sm font-medium",
    style: BTN_SOLID_STYLE
  }, "Add to log")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] overflow-hidden"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: History
  }, /*#__PURE__*/React.createElement("span", {
    className: "pl-0"
  }, "Application History")), /*#__PURE__*/React.createElement("div", {
    className: "px-5 pb-5"
  }, applications.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-[#6B7A5E]"
  }, "No applications logged yet.") : /*#__PURE__*/React.createElement("table", {
    className: "w-full text-sm mono"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-left text-[10px] uppercase text-[#8A9080] border-b border-[#EFF1E8]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Date"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Product"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Rate"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "MOA"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, applications.map(a => {
    const h = HERBICIDES.find(h => h.id === a.herbicideId);
    return /*#__PURE__*/React.createElement("tr", {
      key: a.id,
      className: "border-b border-[#F2F3EE]"
    }, /*#__PURE__*/React.createElement("td", {
      className: "py-2 pr-2"
    }, a.date), /*#__PURE__*/React.createElement("td", {
      className: "py-2 pr-2"
    }, a.field), /*#__PURE__*/React.createElement("td", {
      className: "py-2 pr-2"
    }, a.herbicideName), /*#__PURE__*/React.createElement("td", {
      className: "py-2 pr-2"
    }, a.rate), /*#__PURE__*/React.createElement("td", {
      className: "py-2 pr-2"
    }, h?.moa ?? "—"), /*#__PURE__*/React.createElement("td", {
      className: "py-2 text-right"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onRemove(a.id),
      style: {
        appearance: "none",
        WebkitAppearance: "none",
        border: "none",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: "#B9503F"
      }
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 14
    }))));
  }))))));
}

/* ============================================================
   CUTTING LOG TAB
   ============================================================ */

function CuttingTab({
  cuttings,
  onAdd,
  onRemove
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    field: "",
    notes: ""
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: Scissors
  }, "Log a Cutting"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Date (YYYY-MM-DD)",
    value: form.date,
    onChange: e => setForm({
      ...form,
      date: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Field name",
    value: form.field,
    onChange: e => setForm({
      ...form,
      field: e.target.value
    }),
    list: "known-field-names"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Notes (bales, cutter, etc.)",
    value: form.notes,
    onChange: e => setForm({
      ...form,
      notes: e.target.value
    })
  })), /*#__PURE__*/React.createElement("button", {
    className: "mt-3 px-4 py-2 rounded text-sm font-medium",
    style: BTN_SOLID_STYLE
  }, "Add to log")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-[#D8D9CE] p-5"
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    icon: History
  }, "Cutting History"), cuttings.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-[#6B7A5E]"
  }, "No cuttings logged yet.") : /*#__PURE__*/React.createElement("table", {
    className: "w-full text-sm mono"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "text-left text-[10px] uppercase text-[#8A9080] border-b border-[#EFF1E8]"
  }, /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Date"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Field"), /*#__PURE__*/React.createElement("th", {
    className: "py-2 pr-2"
  }, "Notes"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, cuttings.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.id,
    className: "border-b border-[#F2F3EE]"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-2 pr-2"
  }, c.date), /*#__PURE__*/React.createElement("td", {
    className: "py-2 pr-2"
  }, c.field), /*#__PURE__*/React.createElement("td", {
    className: "py-2 pr-2"
  }, c.notes), /*#__PURE__*/React.createElement("td", {
    className: "py-2 text-right"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemove(c.id),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      border: "none",
      cursor: "pointer",
      backgroundColor: "transparent",
      color: "#B9503F"
    }
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 14
  })))))))));
}

/* ============================================================
   FIELDS TAB — per-field memory: profile + full history, persists between sessions
   ============================================================ */

function FieldsTab({
  applications,
  cuttings,
  fieldProfiles,
  onUpsert,
  onDelete
}) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newFieldName, setNewFieldName] = useState("");
  const fieldNames = useMemo(() => {
    const names = new Set();
    applications.forEach(a => a.field && names.add(a.field));
    cuttings.forEach(c => c.field && names.add(c.field));
    Object.keys(fieldProfiles || {}).forEach(n => names.add(n));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [applications, cuttings, fieldProfiles]);
  const filtered = fieldNames.filter(n => n.toLowerCase().includes(q.toLowerCase()));
  function startEdit(name) {
    const p = fieldProfiles[name] || {};
    setEditForm({
      acreage: p.acreage ?? "",
      soil: p.soil || SOIL_TYPES[0],
      grass: p.grass || GRASS_TYPES[0],
      nearWater: p.nearWater ?? true,
      distToWater: p.distToWater ?? 150,
      notes: p.notes || ""
    });
    setEditing(name);
    setExpanded(name);
  }
  async function saveEdit(name) {
    await onUpsert(name, editForm);
    setEditing(null);
  }
  function buildTimeline(name) {
    const apps = applications.filter(a => a.field === name).map(a => ({
      ...a,
      kind: "spray"
    }));
    const cuts = cuttings.filter(c => c.field === name).map(c => ({
      ...c,
      kind: "cut"
    }));
    return [...apps, ...cuts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 14,
    className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#B9BFAE]"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search fields…",
    className: "pl-8"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newFieldName,
    onChange: e => setNewFieldName(e.target.value),
    placeholder: "Add a field by name…",
    className: "w-48"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      if (!newFieldName.trim()) return;
      await onUpsert(newFieldName, {
        soil: SOIL_TYPES[0],
        grass: GRASS_TYPES[0],
        nearWater: true,
        distToWater: 150,
        acreage: ""
      });
      setNewFieldName("");
    },
    className: "px-3 py-2 rounded text-sm flex items-center gap-1 whitespace-nowrap",
    style: BTN_SOLID_STYLE
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14,
    color: "#FFFFFF"
  }), " Add field"))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-[#6B7A5E] bg-white rounded-xl border border-dashed border-[#D8D9CE] p-6 text-center"
  }, "No fields yet. Log an application or cutting with a field name, or add one above — it'll remember soil, grass type, water distance, and full history here between sessions."), filtered.map(name => {
    const profile = fieldProfiles[name] || {};
    const timeline = buildTimeline(name);
    const isOpen = expanded === name;
    const isEditing = editing === name;
    const lastMoaGroups = timeline.filter(t => t.kind === "spray").slice(0, 4).map(t => HERBICIDES.find(h => h.id === t.herbicideId)?.moa).filter(Boolean);
    return /*#__PURE__*/React.createElement("div", {
      key: name,
      className: "bg-white rounded-xl border border-[#D8D9CE] overflow-hidden"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setExpanded(isOpen ? null : name),
      className: "w-full flex items-center justify-between px-4 py-3 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(MapPin, {
      size: 16,
      className: "text-[#6B7A5E]"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-semibold text-sm"
    }, name), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-[#8A9080]"
    }, profile.acreage ? `${profile.acreage} ac · ` : "", profile.soil || "Soil not set", " · ", profile.grass || "Grass not set", " ·", " ", timeline.filter(t => t.kind === "spray").length, " application", timeline.filter(t => t.kind === "spray").length !== 1 ? "s" : "", " logged"))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, profile.nearWater && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] mono px-1.5 py-0.5 rounded bg-[#E9F0F7] text-[#2F5C7A] flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Waves, {
      size: 11
    }), " ", profile.distToWater ?? "?", " ft"), /*#__PURE__*/React.createElement(ChevronRight, {
      size: 16,
      className: `text-[#B9BFAE] transition-transform ${isOpen ? "rotate-90" : ""}`
    }))), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "border-t border-[#EFF1E8] px-4 py-4 space-y-4"
    }, isEditing ? /*#__PURE__*/React.createElement("div", {
      className: "bg-[#F7F8F3] rounded-lg p-3 space-y-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-[#6B7A5E] block"
    }, "Acreage"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editForm.acreage,
      onChange: e => setEditForm({
        ...editForm,
        acreage: e.target.value
      }),
      className: "w-32",
      placeholder: "e.g. 24"
    })), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-[#6B7A5E] block"
    }, "Soil type"), /*#__PURE__*/React.createElement("select", {
      value: editForm.soil,
      onChange: e => setEditForm({
        ...editForm,
        soil: e.target.value
      })
    }, SOIL_TYPES.map(s => /*#__PURE__*/React.createElement("option", {
      key: s
    }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-[#6B7A5E] block"
    }, "Grass type"), /*#__PURE__*/React.createElement("select", {
      value: editForm.grass,
      onChange: e => setEditForm({
        ...editForm,
        grass: e.target.value
      })
    }, GRASS_TYPES.map(g => /*#__PURE__*/React.createElement("option", {
      key: g
    }, g))))), /*#__PURE__*/React.createElement("label", {
      className: "flex items-center gap-2 text-sm"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: editForm.nearWater,
      onChange: e => setEditForm({
        ...editForm,
        nearWater: e.target.checked
      }),
      className: "w-4 h-4"
    }), "Borders a lake, pond, or creek"), editForm.nearWater && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-[#6B7A5E] block"
    }, "Distance to water (ft)"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editForm.distToWater,
      onChange: e => setEditForm({
        ...editForm,
        distToWater: Number(e.target.value)
      }),
      className: "w-32"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-[10px] text-[#6B7A5E] block"
    }, "Notes"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: editForm.notes,
      onChange: e => setEditForm({
        ...editForm,
        notes: e.target.value
      }),
      placeholder: "Anything worth remembering about this field"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 pt-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => saveEdit(name),
      className: "px-3 py-1.5 rounded text-xs flex items-center gap-1",
      style: BTN_SOLID_STYLE
    }, /*#__PURE__*/React.createElement(Check, {
      size: 12,
      color: "#FFFFFF"
    }), " Save"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditing(null),
      className: "px-3 py-1.5 rounded text-xs",
      style: BTN_GHOST_STYLE
    }, "Cancel"))) : /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm space-y-1 mono"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Acreage:"), " ", profile.acreage || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Soil:"), " ", profile.soil || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Grass:"), " ", profile.grass || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Water:"), " ", profile.nearWater ? `borders water, ~${profile.distToWater} ft buffer` : "not water-adjacent"), profile.notes && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Notes:"), " ", profile.notes), lastMoaGroups.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Recent MOA groups:"), " ", lastMoaGroups.join(", "))), /*#__PURE__*/React.createElement("button", {
      onClick: () => startEdit(name),
      className: "flex items-center gap-1 text-xs shrink-0",
      style: BTN_GHOST_STYLE
    }, /*#__PURE__*/React.createElement(Pencil, {
      size: 12
    }), " Edit")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase tracking-wide text-[#8A9080] mb-2 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Layers, {
      size: 12
    }), " History"), timeline.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-[#8A9080]"
    }, "No applications or cuttings logged for this field yet.") : /*#__PURE__*/React.createElement("ul", {
      className: "space-y-1.5"
    }, timeline.map(t => /*#__PURE__*/React.createElement("li", {
      key: t.id,
      className: "flex items-center gap-2 text-xs mono"
    }, t.kind === "spray" ? /*#__PURE__*/React.createElement(Droplets, {
      size: 12,
      className: "text-[#2B4C3F] shrink-0"
    }) : /*#__PURE__*/React.createElement(Scissors, {
      size: 12,
      className: "text-[#8A9080] shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[#8A9080] w-20 shrink-0"
    }, t.date), t.kind === "spray" ? /*#__PURE__*/React.createElement("span", null, t.herbicideName, " — ", t.rate) : /*#__PURE__*/React.createElement("span", null, "Cut", t.notes ? ` — ${t.notes}` : ""))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDelete(name),
      className: "flex items-center gap-1",
      style: {
        appearance: "none",
        WebkitAppearance: "none",
        border: "none",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: "#B9503F",
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 11
    }), " Remove field profile (history stays in the logs)")));
  }));
}

/* ============================================================
   REFERENCE TAB
   ============================================================ */

function ReferenceTab() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null);
  const filtered = HERBICIDES.filter(h => h.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 14,
    className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#B9BFAE]"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search products…",
    className: "pl-8"
  })), filtered.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.id,
    className: "bg-white rounded-lg border border-[#D8D9CE] overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpanded(expanded === h.id ? null : h.id),
    className: "w-full flex items-center justify-between px-4 py-3 text-left"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-sm"
  }, h.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-[#8A9080] mono"
  }, "MOA ", h.moa, " · ", h.use.join(" & "))), h.restrictedUse && /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 16,
    className: "text-[#B9503F]"
  })), expanded === h.id && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4 text-sm space-y-1.5 border-t border-[#EFF1E8] pt-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Targets:"), " ", h.targets.map(id => WEEDS.find(w => w.id === id)?.name).join(", ")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Rate:"), " ", h.rate), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Grazing restriction:"), " ", h.grazing), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Hay restriction:"), " ", h.hay), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Water buffer:"), " ~", h.waterBufferFt, " ft"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Application window:"), " ", h.tempWindow), /*#__PURE__*/React.createElement("div", {
    className: "text-[#6B7A5E]"
  }, h.notes)))));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(SprayPlanner));