// prisma/load-products.ts
// Bulk-load Victory Pest Solutions product catalog
// Run with: npx dotenv -e .env.local -- npx tsx prisma/load-products.ts
// Idempotent: skips products that already exist (matched by SKU).

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_NAME = "Victory Pest Solutions";
const DEFAULT_MIN_STOCK = 10;
const DEFAULT_MAX_STOCK = 100;

// ─────────────────────────────────────────────────────────────
// Product catalog (107 items)
// ─────────────────────────────────────────────────────────────

type P = {
  sku: string;
  name: string;
  category: string;
  license: string | null; // null = no license required
  epaReg: string | null;
  supplier: string;
  unit: string;
};

const PRODUCTS: P[] = [
  // ===== RODENTICIDES (License: Rodent Control) =====
  { sku: "ROD-001", name: "Contrac Blox 4 lb",                          category: "Rodenticide", license: "Rodent Control", epaReg: "12455-79",  supplier: "Bell Labs",  unit: "lb"   },
  { sku: "ROD-002", name: "Contrac All-Weather Blox 18 kg pail",        category: "Rodenticide", license: "Rodent Control", epaReg: "12455-79",  supplier: "Bell Labs",  unit: "ea"   },
  { sku: "ROD-003", name: "Contrac Soft Bait 4 lb",                     category: "Rodenticide", license: "Rodent Control", epaReg: "12455-103", supplier: "Bell Labs",  unit: "lb"   },
  { sku: "ROD-004", name: "Final Blox 4 lb",                            category: "Rodenticide", license: "Rodent Control", epaReg: "12455-91",  supplier: "Bell Labs",  unit: "lb"   },
  { sku: "ROD-005", name: "Final All-Weather Blox 18 kg pail",          category: "Rodenticide", license: "Rodent Control", epaReg: "12455-95",  supplier: "Bell Labs",  unit: "ea"   },
  { sku: "ROD-006", name: "FastDraw All-Weather Blox 16 lb pail",       category: "Rodenticide", license: "Rodent Control", epaReg: "12455-100", supplier: "Bell Labs",  unit: "ea"   },
  { sku: "ROD-007", name: "FastDraw Soft Bait 4 lb",                    category: "Rodenticide", license: "Rodent Control", epaReg: "12455-104", supplier: "Bell Labs",  unit: "lb"   },
  { sku: "ROD-008", name: "Resolv Soft Bait 4 lb",                      category: "Rodenticide", license: "Rodent Control", epaReg: "7173-309",  supplier: "Liphatech",  unit: "lb"   },
  { sku: "ROD-009", name: "Maki Mini Blocks 4 lb",                      category: "Rodenticide", license: "Rodent Control", epaReg: "7173-225",  supplier: "Liphatech",  unit: "lb"   },
  { sku: "ROD-010", name: "Generation Mini Blocks 4 lb",                category: "Rodenticide", license: "Rodent Control", epaReg: "7173-241",  supplier: "Liphatech",  unit: "lb"   },
  { sku: "ROD-011", name: "Talon Weatherblok XT 4 lb",                  category: "Rodenticide", license: "Rodent Control", epaReg: "100-1057", supplier: "Syngenta",    unit: "lb"   },
  { sku: "ROD-012", name: "First Strike Soft Bait 4 lb",                category: "Rodenticide", license: "Rodent Control", epaReg: "7173-218",  supplier: "Liphatech",  unit: "lb"   },

  // ===== INSECTICIDES (License: General Pest Control) =====
  { sku: "INS-001", name: "Temprid FX 400 ml",                          category: "Insecticide", license: "General Pest Control", epaReg: "432-1483", supplier: "Bayer",       unit: "ml" },
  { sku: "INS-002", name: "Temprid SC 240 ml",                          category: "Insecticide", license: "General Pest Control", epaReg: "432-1483", supplier: "Bayer",       unit: "ml" },
  { sku: "INS-003", name: "Suspend SC 16 oz",                           category: "Insecticide", license: "General Pest Control", epaReg: "432-763",  supplier: "Bayer",       unit: "oz" },
  { sku: "INS-004", name: "Suspend PolyZone 16 oz",                     category: "Insecticide", license: "General Pest Control", epaReg: "432-1517", supplier: "Bayer",       unit: "oz" },
  { sku: "INS-005", name: "Demand CS 8 oz",                             category: "Insecticide", license: "General Pest Control", epaReg: "100-1066", supplier: "Syngenta",    unit: "oz" },
  { sku: "INS-006", name: "Demand CS 16 oz",                            category: "Insecticide", license: "General Pest Control", epaReg: "100-1066", supplier: "Syngenta",    unit: "oz" },
  { sku: "INS-007", name: "Demon WP 0.33 oz envelope",                  category: "Insecticide", license: "General Pest Control", epaReg: "100-1066", supplier: "Syngenta",    unit: "ea" },
  { sku: "INS-008", name: "Cy-Kick CS 16 oz",                           category: "Insecticide", license: "General Pest Control", epaReg: "499-528",  supplier: "BASF",        unit: "oz" },
  { sku: "INS-009", name: "Talstar Professional 32 oz",                 category: "Insecticide", license: "General Pest Control", epaReg: "279-3206", supplier: "FMC",         unit: "oz" },
  { sku: "INS-010", name: "Onslaught FastCap 8 oz",                     category: "Insecticide", license: "General Pest Control", epaReg: "1021-2574",supplier: "MGK",         unit: "oz" },
  { sku: "INS-011", name: "Tempo SC Ultra 240 ml",                      category: "Insecticide", license: "General Pest Control", epaReg: "432-1363", supplier: "Bayer",       unit: "ml" },
  { sku: "INS-012", name: "Phantom SC 21 oz",                           category: "Insecticide", license: "General Pest Control", epaReg: "241-392",  supplier: "BASF",        unit: "oz" },
  { sku: "INS-013", name: "Maxforce FC Magnum Cockroach Gel 33 g",      category: "Insecticide", license: "General Pest Control", epaReg: "432-1259", supplier: "Bayer",       unit: "ea" },
  { sku: "INS-014", name: "Maxforce Quantum Ant Gel 30 g",              category: "Insecticide", license: "General Pest Control", epaReg: "432-1506", supplier: "Bayer",       unit: "ea" },
  { sku: "INS-015", name: "Maxforce FC Roach Bait Stations (pack of 72)", category: "Insecticide", license: "General Pest Control", epaReg: "432-1255", supplier: "Bayer",     unit: "pack" },
  { sku: "INS-016", name: "Advion Cockroach Gel 30 g",                  category: "Insecticide", license: "General Pest Control", epaReg: "100-1485", supplier: "Syngenta",    unit: "ea" },
  { sku: "INS-017", name: "Advion Ant Gel 30 g",                        category: "Insecticide", license: "General Pest Control", epaReg: "100-1498", supplier: "Syngenta",    unit: "ea" },
  { sku: "INS-018", name: "Optigard Ant Gel 30 g",                      category: "Insecticide", license: "General Pest Control", epaReg: "100-1483", supplier: "Syngenta",    unit: "ea" },
  { sku: "INS-019", name: "Advance Granular Carpenter Ant Bait 8 oz",   category: "Insecticide", license: "General Pest Control", epaReg: "499-370",  supplier: "BASF",        unit: "oz" },
  { sku: "INS-020", name: "Gentrol IGR Point Source (pack of 20)",      category: "Insecticide", license: "General Pest Control", epaReg: "2724-484", supplier: "Zoecon",      unit: "pack" },
  { sku: "INS-021", name: "Gentrol IGR Concentrate 1 oz",               category: "Insecticide", license: "General Pest Control", epaReg: "2724-488", supplier: "Zoecon",      unit: "oz" },
  { sku: "INS-022", name: "Nyguard IGR Concentrate 16 oz",              category: "Insecticide", license: "General Pest Control", epaReg: "1021-1701",supplier: "MGK",         unit: "oz" },
  { sku: "INS-023", name: "Alpine PT Aerosol 17.5 oz",                  category: "Insecticide", license: "General Pest Control", epaReg: "499-552",  supplier: "BASF",        unit: "oz" },
  { sku: "INS-024", name: "CB-80 Pyrethrum Aerosol 17 oz",              category: "Insecticide", license: "General Pest Control", epaReg: "8730-21",  supplier: "Zoecon",      unit: "oz" },
  { sku: "INS-025", name: "CimeXa Insecticide Dust 4 oz",               category: "Insecticide", license: "General Pest Control", epaReg: "73079-12", supplier: "Rockwell Labs", unit: "oz" },
  { sku: "INS-026", name: "Drione Insecticide Dust 1 lb",               category: "Insecticide", license: "General Pest Control", epaReg: "432-992",  supplier: "Bayer",       unit: "lb" },

  // ===== TERMITICIDES (License: Termite/WDO) =====
  { sku: "INS-027", name: "Termidor SC 78 oz",                          category: "Insecticide", license: "Termite/WDO", epaReg: "7969-210", supplier: "BASF",  unit: "oz" },
  { sku: "INS-028", name: "Termidor HE 79 oz",                          category: "Insecticide", license: "Termite/WDO", epaReg: "7969-291", supplier: "BASF",  unit: "oz" },
  { sku: "INS-029", name: "Premise 75 WSP 1.6 oz",                      category: "Insecticide", license: "Termite/WDO", epaReg: "432-1331", supplier: "Bayer", unit: "oz" },

  // ===== ROUND 2 ADDITIONS =====
  { sku: "INS-030", name: "OneGuard MultiMetaActive 32 oz",             category: "Insecticide", license: "General Pest Control", epaReg: "279-3506", supplier: "Envu",                  unit: "oz" },
  { sku: "INS-031", name: "Nibor-D 1.5 lb",                             category: "Insecticide", license: "General Pest Control", epaReg: "64405-2",  supplier: "Nisus Corporation",     unit: "lb" },
  { sku: "INS-032", name: "Taurus SC 78 oz",                            category: "Insecticide", license: "Termite/WDO",          epaReg: "53883-279",supplier: "Control Solutions Inc", unit: "oz" },
  { sku: "INS-033", name: "Taurus NY SC 78 oz",                         category: "Insecticide", license: "Termite/WDO",          epaReg: "53883-279",supplier: "Control Solutions Inc", unit: "oz" },
  { sku: "INS-034", name: "DeltaDust 1 lb",                             category: "Insecticide", license: "General Pest Control", epaReg: "432-772",  supplier: "Bayer",                 unit: "lb" },
  { sku: "INS-035", name: "Victory Bio Blast Foam",                     category: "Insecticide", license: "General Pest Control", epaReg: null,        supplier: "Victory Private Label", unit: "ea" },

  // ===== ROUND 3 ADDITIONS (Vendetta line) =====
  { sku: "INS-036", name: "Vendetta Plus Cockroach Gel 30 g",           category: "Insecticide", license: "General Pest Control", epaReg: "1021-2596", supplier: "MGK", unit: "ea" },
  { sku: "INS-037", name: "Vendetta Cockroach Gel 30 g",                category: "Insecticide", license: "General Pest Control", epaReg: "1021-2597", supplier: "MGK", unit: "ea" },
  { sku: "INS-038", name: "Vendetta Nitro Cockroach Gel 30 g",          category: "Insecticide", license: "General Pest Control", epaReg: "1021-2911", supplier: "MGK", unit: "ea" },

  // ===== FUMIGANTS (License: Fumigation) =====
  { sku: "FUM-001", name: "ProFume Cylinder 125 lb",                    category: "Fumigant", license: "Fumigation", epaReg: "81824-9", supplier: "Douglas Products",  unit: "ea" },
  { sku: "FUM-002", name: "Phostoxin Tablets (flask of 500)",           category: "Fumigant", license: "Fumigation", epaReg: "72959-1", supplier: "Degesch America",   unit: "ea" },
  { sku: "FUM-003", name: "Vikane Cylinder 125 lb",                     category: "Fumigant", license: "Fumigation", epaReg: "81824-1", supplier: "Douglas Products",  unit: "ea" },

  // ===== TRAP / DEVICE (no license) =====
  { sku: "TRP-001", name: "Victor M154 Wood Mouse Snap Trap",           category: "Trap/Device", license: null, epaReg: null, supplier: "Woodstream", unit: "ea" },
  { sku: "TRP-002", name: "Victor M326 Wood Rat Snap Trap",             category: "Trap/Device", license: null, epaReg: null, supplier: "Woodstream", unit: "ea" },
  { sku: "TRP-003", name: "T-Rex Rat Snap Trap",                        category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-004", name: "Trapper Mini Rex Mouse Snap Trap",           category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-005", name: "Catchmaster 72MB Mouse Glue Board (pack of 6)", category: "Trap/Device", license: null, epaReg: null, supplier: "AP&G",     unit: "pack" },
  { sku: "TRP-006", name: "Catchmaster 48WRG Rat Glue Board (pack of 12)", category: "Trap/Device", license: null, epaReg: null, supplier: "AP&G",     unit: "pack" },
  { sku: "TRP-007", name: "Protecta LP Mouse Bait Station",             category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-008", name: "Protecta EVO Express Rat Station",           category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-009", name: "Protecta EVO Edge Exterior Station",         category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-010", name: "Protecta Sidekick Mouse Station",            category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-011", name: "EZ Klean Rat Bait Station",                  category: "Trap/Device", license: null, epaReg: null, supplier: "Bell Labs",  unit: "ea" },
  { sku: "TRP-012", name: "Aegis RP Rat Bait Station",                  category: "Trap/Device", license: null, epaReg: null, supplier: "Liphatech",  unit: "ea" },
  { sku: "TRP-013", name: "Aegis LP Mouse Bait Station",                category: "Trap/Device", license: null, epaReg: null, supplier: "Liphatech",  unit: "ea" },
  { sku: "TRP-014", name: "Tin Cat Multi-Catch Mouse Trap",             category: "Trap/Device", license: null, epaReg: null, supplier: "Victor",     unit: "ea" },
  { sku: "TRP-015", name: "Ketch-All Mouse Multi-Catch Trap",           category: "Trap/Device", license: null, epaReg: null, supplier: "Kness",      unit: "ea" },
  { sku: "TRP-016", name: "Vector Classic ILT (UV Insect Light Trap)",  category: "Trap/Device", license: null, epaReg: null, supplier: "PestWest",   unit: "ea" },
  { sku: "TRP-017", name: "ILT Glue Board Refill (pack of 6)",          category: "Trap/Device", license: null, epaReg: null, supplier: "PestWest",   unit: "pack" },
  { sku: "TRP-018", name: "Pheromone Trap - Indian Meal Moth (pack of 6)", category: "Trap/Device", license: null, epaReg: null, supplier: "Trécé",  unit: "pack" },
  { sku: "TRP-019", name: "Pheromone Trap - Cigarette Beetle (pack of 6)", category: "Trap/Device", license: null, epaReg: null, supplier: "Trécé",  unit: "pack" },
  { sku: "TRP-020", name: "Storgard QuickChange Pheromone Lure",        category: "Trap/Device", license: null, epaReg: null, supplier: "Trécé",      unit: "ea" },
  { sku: "TRP-021", name: "Bird Spike 10 ft Strip",                     category: "Trap/Device", license: null, epaReg: null, supplier: "Bird-X",     unit: "ea" },
  { sku: "TRP-022", name: "Bird Netting 14x14 ft",                      category: "Trap/Device", license: null, epaReg: null, supplier: "Bird-X",     unit: "ea" },
  { sku: "TRP-023", name: "Victory Branded Glue Board (pack of 12)",    category: "Trap/Device", license: null, epaReg: null, supplier: "Victory Private Label", unit: "pack" },
  { sku: "TRP-024", name: "Mouse Snap Trap (generic)",                  category: "Trap/Device", license: null, epaReg: null, supplier: "Various",    unit: "ea" },
  { sku: "TRP-025", name: "Rat Snap Trap (generic)",                    category: "Trap/Device", license: null, epaReg: null, supplier: "Various",    unit: "ea" },

  // ===== PPE (no license) =====
  { sku: "EPP-001", name: "Respirator 3M N95 (box of 20)",              category: "PPE", license: null, epaReg: null, supplier: "3M",          unit: "box" },
  { sku: "EPP-002", name: "Respirator 3M 6800 Full Face",               category: "PPE", license: null, epaReg: null, supplier: "3M",          unit: "ea"  },
  { sku: "EPP-003", name: "Cartridge 3M 60923 Organic Vapor / P100 (pair)", category: "PPE", license: null, epaReg: null, supplier: "3M",      unit: "ea"  },
  { sku: "EPP-004", name: "Nitrile Gloves (box of 100)",                category: "PPE", license: null, epaReg: null, supplier: "Various",     unit: "box" },
  { sku: "EPP-005", name: "Tyvek Coverall Size L",                      category: "PPE", license: null, epaReg: null, supplier: "DuPont",      unit: "ea"  },
  { sku: "EPP-006", name: "Tyvek Coverall Size XL",                     category: "PPE", license: null, epaReg: null, supplier: "DuPont",      unit: "ea"  },
  { sku: "EPP-007", name: "Safety Glasses Clear",                       category: "PPE", license: null, epaReg: null, supplier: "3M",          unit: "ea"  },
  { sku: "EPP-008", name: "Splash Goggles Chemical",                    category: "PPE", license: null, epaReg: null, supplier: "3M",          unit: "ea"  },
  { sku: "EPP-009", name: "Boot Covers Disposable (pack of 50)",        category: "PPE", license: null, epaReg: null, supplier: "Various",     unit: "pack" },
  { sku: "EPP-010", name: "Hard Hat White",                             category: "PPE", license: null, epaReg: null, supplier: "MSA",         unit: "ea"  },
  { sku: "EPP-011", name: "Hair Net (box of 100)",                      category: "PPE", license: null, epaReg: null, supplier: "Various",     unit: "box" },
  { sku: "EPP-012", name: "Beard Cover (box of 100)",                   category: "PPE", license: null, epaReg: null, supplier: "Various",     unit: "box" },

  // ===== EQUIPMENT (no license) =====
  { sku: "EQP-001", name: "B&G Sprayer 1.5 gal Compressed Air",         category: "Equipment", license: null, epaReg: null, supplier: "B&G Equipment",    unit: "ea" },
  { sku: "EQP-002", name: "Birchmeier Iris 8L Backpack Sprayer",        category: "Equipment", license: null, epaReg: null, supplier: "Birchmeier",       unit: "ea" },
  { sku: "EQP-003", name: "B&G Bellow Hand Duster",                     category: "Equipment", license: null, epaReg: null, supplier: "B&G Equipment",    unit: "ea" },
  { sku: "EQP-004", name: "B&G Crusader Power Duster",                  category: "Equipment", license: null, epaReg: null, supplier: "B&G Equipment",    unit: "ea" },
  { sku: "EQP-005", name: "Curtis Dyna-Fog ULV Cold Fogger",            category: "Equipment", license: null, epaReg: null, supplier: "Curtis Dyna-Fog",  unit: "ea" },
  { sku: "EQP-006", name: "B&G Termite Foamer",                         category: "Equipment", license: null, epaReg: null, supplier: "B&G Equipment",    unit: "ea" },
  { sku: "EQP-007", name: "Maglite Heavy Duty Flashlight",              category: "Equipment", license: null, epaReg: null, supplier: "Maglite",          unit: "ea" },
  { sku: "EQP-008", name: "LED Headlamp",                               category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-009", name: "Inspection Mirror with Extension",           category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-010", name: "Putty Knife",                                category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-011", name: "Wire Brush Set",                             category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-012", name: "Caulk Gun",                                  category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-013", name: "Marking Paint Spray Can",                    category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-014", name: "Measuring Wheel",                            category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-015", name: "Borescope / Inspection Camera",              category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-016", name: "Copper Mesh 100 ft roll",                    category: "Equipment", license: null, epaReg: null, supplier: "Various",          unit: "ea" },
  { sku: "EQP-017", name: "Pur Black NF Pest Foam 24 oz",               category: "Equipment", license: null, epaReg: null, supplier: "Todol Pur Black", unit: "ea" },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeSlash(s: string): string {
  return normalize(s).replace(/\s*\/\s*/g, "/");
}

async function getOrCreateSupplier(companyId: string, name: string): Promise<string | null> {
  if (!name || name === "Various") return null;
  const existing = await prisma.supplier.findFirst({ where: { companyId, name } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({
    data: { companyId, name, active: true },
  });
  console.log(`  + Created supplier: ${name}`);
  return created.id;
}

async function getOrCreateUnit(companyId: string, abbrev: string): Promise<string | null> {
  if (!abbrev) return null;
  const existing = await prisma.unitOfMeasure.findFirst({
    where: { companyId, OR: [{ name: abbrev }, { abbreviation: abbrev }] },
  });
  if (existing) return existing.id;
  // Map common abbreviations to full names
  const nameMap: Record<string, string> = {
    ea: "Each", lb: "Pound", oz: "Ounce", ml: "Milliliter",
    kg: "Kilogram", g: "Gram", pack: "Pack", box: "Box",
  };
  const fullName = nameMap[abbrev] || abbrev;
  const created = await prisma.unitOfMeasure.create({
    data: { companyId, name: fullName, abbreviation: abbrev, active: true },
  });
  console.log(`  + Created unit: ${fullName} (${abbrev})`);
  return created.id;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Loading Victory Pest Solutions product catalog...\n");

  // 1. Company
  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    throw new Error(`Company "${COMPANY_NAME}" not found. Run npx prisma db seed first.`);
  }
  console.log(`Company: ${company.name} (${company.id})`);

  // 2. Locations
  const locations = await prisma.location.findMany({
    where: { companyId: company.id, active: true },
  });
  if (locations.length === 0) {
    throw new Error("No active locations found for company.");
  }
  console.log(`Locations: ${locations.map((l) => l.name).join(", ")} (${locations.length})`);

  // 3. Pre-fetch lookups
  const categoriesDb = await prisma.productCategory.findMany({ where: { companyId: company.id } });
  const licensesDb = await prisma.licenseType.findMany({ where: { companyId: company.id } });

  console.log(`Categories in DB: ${categoriesDb.map((c) => c.name).join(", ")}`);
  console.log(`Licenses in DB:   ${licensesDb.map((l) => l.name).join(", ")}\n`);

  const findCategory = (name: string) => {
    const norm = normalizeSlash(name);
    return categoriesDb.find((c) => normalizeSlash(c.name) === norm);
  };
  const findLicense = (name: string) => {
    const norm = normalizeSlash(name);
    return licensesDb.find((l) => normalizeSlash(l.name) === norm);
  };

  // 4. Load products
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of PRODUCTS) {
    try {
      const existing = await prisma.product.findFirst({
        where: { companyId: company.id, sku: p.sku },
      });
      if (existing) {
        skipped++;
        console.log(`⊙ Skip   ${p.sku}  (already exists)`);
        continue;
      }

      const category = findCategory(p.category);
      if (!category) {
        errors++;
        console.error(`✗ ERROR  ${p.sku}  Category not found: "${p.category}"`);
        continue;
      }

      const license = p.license ? findLicense(p.license) : null;
      if (p.license && !license) {
        errors++;
        console.error(`✗ ERROR  ${p.sku}  License not found: "${p.license}"`);
        continue;
      }

      const supplierId = await getOrCreateSupplier(company.id, p.supplier);
      const unitId = await getOrCreateUnit(company.id, p.unit);

      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          supplierId,
          unitId,
          name: p.name,
          sku: p.sku,
          epaRegistration: p.epaReg ?? null,
          requiresLicense: !!license,
          active: true,
        },
      });

      if (license) {
        await prisma.productLicense.create({
          data: { productId: product.id, licenseTypeId: license.id },
        });
      }

      // Activate at each location with default min/max + stock = 0
      for (const loc of locations) {
        await prisma.locationProduct.upsert({
          where: { locationId_productId: { locationId: loc.id, productId: product.id } },
          create: {
            locationId: loc.id,
            productId: product.id,
            minStock: new Prisma.Decimal(DEFAULT_MIN_STOCK),
            maxStock: new Prisma.Decimal(DEFAULT_MAX_STOCK),
            active: true,
          },
          update: {},
        });
        await prisma.stock.upsert({
          where: { locationId_productId: { locationId: loc.id, productId: product.id } },
          create: {
            locationId: loc.id,
            productId: product.id,
            quantity: new Prisma.Decimal(0),
          },
          update: {},
        });
      }

      created++;
      console.log(`✓ Create ${p.sku}  ${p.name}`);
    } catch (e: any) {
      errors++;
      console.error(`✗ ERROR  ${p.sku}  ${e.message}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✓ Created:  ${created}`);
  console.log(`⊙ Skipped:  ${skipped}  (already existed)`);
  console.log(`✗ Errors:   ${errors}`);
  console.log(`Total:      ${PRODUCTS.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("\nFATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
