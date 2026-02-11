let cleanedData = null;

document.getElementById("fileInput").addEventListener("change", handleFile);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const raw = JSON.parse(reader.result);
    cleanedData = parseRoster(raw);
    window.cleanedData = cleanedData;

    // Show buttons (optional)
    document.getElementById("download-pdf").style.display = "inline-block";
    document.getElementById("card-placeholder")?.remove();
    // NEW: automatically render cards
    renderCards(cleanedData);
  };
  reader.readAsText(file);
}

/* -------------------------------------------------------
   1. Extract units AND standalone characters
------------------------------------------------------- */
function extractUnits(root) {
  const units = [];

  function walk(node, insideUnit = false) {
    if (!node || typeof node !== "object") return;

    if (node.type === "unit") {
      units.push(node);
      insideUnit = true;
    }

    if (node.type === "model" && !insideUnit) {
      const hasUnitProfile = node.profiles?.some(p => p.typeName === "Unit");
      if (hasUnitProfile) units.push(node);
    }

    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) value.forEach(child => walk(child, insideUnit));
      else if (typeof value === "object") walk(value, insideUnit);
    }
  }

  walk(root, false);
  return units;
}

/* -------------------------------------------------------
   2. Parse a single unit
------------------------------------------------------- */
function parseUnit(unit) {
  return {
    name: unit.name,
    keywords: (unit.categories || []).map(c => c.name),

    // NEW separated ability fields
    genericAbilities: extractGenericAbilities(unit),
    uniqueAbilities: extractUniqueAbilities(unit),

    characteristics: extractCharacteristics(unit),
    weapons: extractWeapons(unit),
    wargear: extractWargear(unit),
    enhancements: extractEnhancements(unit),
    composition: extractComposition(unit)
  };
}

/* -------------------------------------------------------
   3. Generic Abilities (from unit.rules)
------------------------------------------------------- */
function extractGenericAbilities(unit) {
  const abilities = [];

  // 1. Normal generic abilities from unit.rules
  if (unit.rules) {
    unit.rules
      .filter(r => !r.hidden)
      .forEach(r => abilities.push(r.name.trim()));
  }

  // 2. Transport capacity (if present)
  if (unit.profiles) {
    const transportProfile = unit.profiles.find(p => p.typeName === "Transport");

    if (transportProfile) {
      const cap = transportProfile.characteristics?.find(c => c.name === "Capacity");

      if (cap && cap.$text) {
        // Extract the first number only
        const match = cap.$text.match(/(\d+)/);
        if (match) {
          abilities.push(`Capacity: ${match[1]}`);
        }
      }
    }
  }

  return abilities;
}


/* -------------------------------------------------------
   4. Unique Abilities (profiles of type "Abilities")
------------------------------------------------------- */
function extractUniqueAbilities(unit) {
  if (!unit.profiles) return [];
  return unit.profiles
    .filter(p => p.typeName === "Abilities")
    .map(p => p.name.trim());
}

/* -------------------------------------------------------
   5. Characteristics (dedupe by stats)
------------------------------------------------------- */
function extractCharacteristics(unit) {
  const profiles = [];
  const seen = new Set();

  if (unit.type === "model") {
    const profile = unit.profiles?.find(p => p.typeName === "Unit");
    if (profile) profiles.push(convertProfile(profile));
    return profiles;
  }

  const models = (unit.selections || []).filter(s => s.type === "model");

  models.forEach(model => {
    model.profiles?.forEach(p => {
      if (p.typeName === "Unit") {
        const key = makeProfileKey(p);
        if (!seen.has(key)) {
          seen.add(key);
          profiles.push(convertProfile(p));
        }
      }
    });
  });

  if (profiles.length === 0) {
    unit.profiles?.forEach(p => {
      if (p.typeName === "Unit") {
        const key = makeProfileKey(p);
        if (!seen.has(key)) {
          seen.add(key);
          profiles.push(convertProfile(p));
        }
      }
    });
  }

  return profiles;
}

function makeProfileKey(profile) {
  const parts = [];
  profile.characteristics?.forEach(ch => {
    parts.push(ch.name + ":" + ch.$text);
  });
  parts.sort();
  return parts.join("|");
}

function convertProfile(profile) {
  const out = { name: profile.name };
  profile.characteristics?.forEach(ch => {
    out[ch.name] = ch.$text;
  });
  return out;
}

/* -------------------------------------------------------
   6. Weapons (recursive, deduped, cleaned)
------------------------------------------------------- */
function extractWeapons(unit) {
  let models = [];

  if (unit.type === "model") {
    models = [unit];
  } else {
    models = (unit.selections || []).filter(s => s.type === "model");
  }

  const map = {};

  function addWeapon(profile, count) {
    const cleanName = profile.name.replace(/^➤\s*/, "");

    const name = cleanName;
    const type = profile.typeName;

    const chars = {};
    profile.characteristics?.forEach(ch => {
      chars[ch.name] = ch.$text;
    });

    const key = name + "|" + JSON.stringify(chars);

    if (!map[key]) {
      map[key] = {
        name,
        count: 0,
        type,
        characteristics: chars
      };
    }

    map[key].count += count;
  }

  function scan(selections) {
    if (!selections) return;

    selections.forEach(sel => {
      if (sel.type === "upgrade" && sel.profiles) {

        if (sel.profiles.length === 1) {
          const p = sel.profiles[0];
          const isWeapon =
            p.typeName === "Ranged Weapons" ||
            p.typeName === "Melee Weapons";

          if (isWeapon) addWeapon(p, sel.number || 1);
        }

        if (sel.profiles.length > 1) {
          sel.profiles.forEach(p => {
            const isWeapon =
              p.typeName === "Ranged Weapons" ||
              p.typeName === "Melee Weapons";

            if (isWeapon) addWeapon(p, sel.number || 1);
          });
        }
      }

      if (sel.selections) scan(sel.selections);
    });
  }

  models.forEach(model => scan(model.selections));

  return Object.values(map);
}

/* -------------------------------------------------------
   7. Wargear
------------------------------------------------------- */
function extractWargear(unit) {
  const wargear = [];

  function scan(selections) {
    if (!selections) return;

    selections.forEach(sel => {
      const isEnhancement =
        typeof sel.group === "string" &&
        sel.group.toLowerCase().includes("enhancement");

      const isWargear =
        sel.type === "upgrade" &&
        !isEnhancement &&
        sel.profiles?.some(p => p.typeName === "Abilities");

      if (isWargear) {
        wargear.push({
          name: sel.name,
          count: sel.number || 1
        });
      }

      if (sel.selections) scan(sel.selections);
    });
  }

  if (unit.type === "model") {
    scan(unit.selections);
  } else {
    const models = (unit.selections || []).filter(s => s.type === "model");
    models.forEach(model => scan(model.selections));
  }

  return wargear;
}

/* -------------------------------------------------------
   8. Enhancements
------------------------------------------------------- */
function extractEnhancements(unit) {
  const enhancements = [];

  function scan(selections) {
    if (!selections) return;

    selections.forEach(sel => {
      const isEnhancement =
        sel.type === "upgrade" &&
        typeof sel.group === "string" &&
        sel.group.toLowerCase().includes("enhancement");

      if (isEnhancement) {
        enhancements.push({
          name: sel.name,
          count: 1,
          cost: sel.costs?.find(c => c.name === "pts")?.value || null
        });
      }

      if (sel.selections) scan(sel.selections);
    });
  }

  if (unit.type === "model") {
    scan(unit.selections);
  } else {
    const models = (unit.selections || []).filter(s => s.type === "model");
    models.forEach(model => scan(model.selections));
  }

  return enhancements;
}

/* -------------------------------------------------------
   9. Composition
------------------------------------------------------- */
function extractComposition(unit) {
  if (unit.type === "model") {
    return "1 model";
  }

  const models = (unit.selections || []).filter(s => s.type === "model");
  const total = models.reduce((sum, m) => sum + (m.number || 0), 0);

  return `${total} models`;
}




/* -------------------------------------------------------
   10. Full pipeline
------------------------------------------------------- */
function parseRoster(json) {
  const units = extractUnits(json);
  return units.map(parseUnit);
}

/* -------------------------------------------------------
   11. Download cleaned JSON
------------------------------------------------------- */
document.getElementById("downloadBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(cleanedData, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cleaned_roster.json";
  a.click();
  URL.revokeObjectURL(url);
});
