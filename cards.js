// Weapon keyword shorthand map
const keywordShorthand = {
    "Assault": "As",
    "Rapid Fire": "RF",
    "Ignores Cover": "IC",
    "Twin-linked": "TL",
    "Pistol": "Pi",
    "Torrent": "To",
    "Lethal Hits": "Lethal",
    "Lance": "La",
    "Indirect Fire": "IF",
    "Precision": "Pr",
    "Blast": "Bl",
    "Melta": "M",
    "Heavy": "H",
    "Hazardous": "Hz",
    "Devastating Wounds": "Dev",
    "Sustained Hits": "Sus",
    "Extra Attacks": "EA",
    "Anti": "A", // Anti-Infantry 4+ → A‑4+
    "One Shot": "OS",
    "Psychic": "Psy",
    "Conversion": "Cv"
};

function convertKeywordToShorthand(keyword) {
    keyword = keyword.trim();

    // --- Anti-Keyword X+ ---
    if (keyword.startsWith("Anti-")) {
        // Normalise weird hyphens and whitespace
        let rest = keyword.replace("Anti-", "")
            .replace(/\u2011|\u2012|\u2013|\u2014/g, "-") // convert unicode hyphens
            .replace(/\s+/g, " ")                        // collapse whitespace
            .trim();

        const parts = rest.split(" ").filter(p => p.length);

        const target = parts[0];
        let value = parts[1] || "";

        // Remove ALL leading punctuation (hyphens, en-dashes, em-dashes)
        value = value.replace(/^[\-\u2011\u2012\u2013\u2014]+/, "");

        const targetMap = {
            "Infantry": "I",
            "Vehicle": "V",
            "Monster": "M",
            "Fly": "F",
            "Character": "C",
            "Psyker": "P",
            "Beast": "B",
            "Swarm": "S",
            "Titanic": "T"
        };

        const letter = targetMap[target] || target[0];

        return value ? `A-${letter}${value}` : `A-${letter}`;
    }




    // --- Keywords with numbers (Rapid Fire 2, Melta 2, SH 1, etc.) ---
    const match = keyword.match(/^(.*?)(\d[\d\+]*)$/);
    if (match) {
        const base = match[1].trim();
        const num = match[2].trim();
        const code = keywordShorthand[base] || base;
        return `${code}-${num}`;
    }

    // --- Simple keywords ---
    return keywordShorthand[keyword] || keyword;
}

function renderCards(data) {
    const container = document.getElementById("card-inner");
    container.innerHTML = "";

    data.forEach(unit => {
        const card = document.createElement("div");
        card.className = "card";

        // -------------------------------------------------------
        // 1. NAME
        // -------------------------------------------------------

        // Find invulnerable save in unique abilities
        let invuln = null;

        unit.uniqueAbilities.forEach(a => {
            const match = a.match(/Invulnerable Save\s*(\d\+)/i);
            if (match) invuln = match[1];
        });


        // Find Feel No Pain value (prefer unique abilities)
        let fnp = null;

        // 1. Check unique abilities first (these contain the value)
        unit.uniqueAbilities.forEach(a => {
            const match = a.match(/Feel No Pain\s*(\d\+)/i);
            if (match) fnp = match[1];
        });

        // 2. If still null, check generic abilities (rare but possible)
        if (!fnp) {
            unit.genericAbilities.forEach(a => {
                const match = a.match(/Feel No Pain\s*(\d\+)/i);
                if (match) fnp = match[1];
            });
        }

        let headerHTML = `
            <div class="card-header">
                <div class="unit-header">
                    <h2>${unit.name}</h2>
                    <div class="unit-badges">
                        ${invuln ? `<div class="invuln-box">${invuln}+</div>` : ""}
                        ${fnp ? `<div class="fnp-box">${fnp}++</div>` : ""}
                    </div>
                </div>
`;
headerHTML += `</div>`; // close .card-header
        const showNames = unit.characteristics.length > 1;

        unit.characteristics.forEach((profile, index) => {

            if (showNames) {
                headerHTML += `<div class="model-name">${profile.name}</div>`;
            }

            if (index === 0) {
                headerHTML += `
            <div class="stat-header">
                <div>M</div>
                <div>T</div>
                <div>SV</div>
                <div>W</div>
                <div>LD</div>
                <div>OC</div>
            </div>
        `;
            }

            headerHTML += `
                <div class="stat-block">
                    <div>${profile.M}</div>
                    <div>${profile.T}</div>
                    <div>${profile.SV}</div>
                    <div>${profile.W}</div>
                    <div>${profile.LD}</div>
                    <div>${profile.OC}</div>
                </div>
            `;
        });

        

        card.innerHTML += headerHTML;


        // Separator after characteristics
        card.innerHTML += `<div class="section-separator"></div>`;

        // -------------------------------------------------------
        // 3. WEAPONS (ranged + melee split)
        // -------------------------------------------------------
        if (unit.weapons.length > 0) {

            // Split weapons
            const ranged = [];
            const melee = [];

            unit.weapons.forEach(w => {
                if (w.type === "Melee Weapons") melee.push(w);
                else ranged.push(w);
            });

            // Group by base name
            function groupWeapons(list) {
                const groups = {};
                list.forEach(w => {
                    const base = w.name.includes(" - ")
                        ? w.name.split(" - ")[0]
                        : w.name;

                    if (!groups[base]) groups[base] = [];
                    groups[base].push(w);
                });
                return groups;
            }

            const rangedGroups = groupWeapons(ranged);
            const meleeGroups = groupWeapons(melee);

            // NEW: helper to render keyword spans
            function renderKeywordSpans(keywordString) {
                if (!keywordString || keywordString === "-") return "";

                // Split by comma, trim
                const parts = keywordString.split(",").map(k => k.trim()).filter(k => k.length);

                // Convert each to shorthand
                const shorthandParts = parts.map(k => convertKeywordToShorthand(k));

                const spans = shorthandParts.map(k =>
                    `<span class="wp-keyword">${k}</span>`
                ).join(", ");

                return `<span class="wp-keywords-inline">${spans}</span>`;
            }


            // Render a weapon section
            function renderWeaponSection(title, groups, isMelee) {
                let html = `
        <div class="weapon-header">
          <span class="wh-title">${title}</span>
          <span class="wh-stat">R</span>
          <span class="wh-stat">A</span>
          <span class="wh-stat">${isMelee ? "WS" : "BS"}</span>
          <span class="wh-stat">S</span>
          <span class="wh-stat">AP</span>
          <span class="wh-stat">D</span>
        </div>
        `;

                Object.entries(groups).forEach(([baseName, profiles]) => {

                    // MULTI-PROFILE
                    if (profiles.length > 1) {
                        html += `<div class="weapon-parent">${baseName}</div>`;

                        profiles.forEach(w => {
                            const profileName = w.name.includes(" - ")
                                ? w.name.split(" - ")[1]
                                : "";

                            const range = isMelee ? "M" : w.characteristics.Range;
                            const hitStat = isMelee ? w.characteristics.WS : w.characteristics.BS;

                            // Convert full keywords → shorthand
                            let kw = w.characteristics.Keywords || "";
                            let kwList = kw.split(",").map(k => convertKeywordToShorthand(k.trim()));
                            const keywordHtml = renderKeywordSpans(kwList.join(", "));


                            html += `
                    <div class="weapon-inline-row profile-row">
                      <div class="wp-name">- ${profileName}
                        ${keywordHtml}
                      </div>
                      <div class="wp-stat">${range}</div>
                      <div class="wp-stat">${w.characteristics.A}</div>
                      <div class="wp-stat">${hitStat}</div>
                      <div class="wp-stat">${w.characteristics.S}</div>
                      <div class="wp-stat">${w.characteristics.AP}</div>
                      <div class="wp-stat">${w.characteristics.D}</div>
                    </div>
                    `;
                        });
                    }

                    // SINGLE-PROFILE
                    else {
                        const w = profiles[0];

                        const range = isMelee ? "M" : w.characteristics.Range;
                        const hitStat = isMelee ? w.characteristics.WS : w.characteristics.BS;

                        const keywordHtml = renderKeywordSpans(w.characteristics.Keywords);

                        html += `
                <div class="weapon-inline-row">
                  <div class="wp-name">
                    ${baseName}
                    ${keywordHtml}
                  </div>
                  <div class="wp-stat">${range}</div>
                  <div class="wp-stat">${w.characteristics.A}</div>
                  <div class="wp-stat">${hitStat}</div>
                  <div class="wp-stat">${w.characteristics.S}</div>
                  <div class="wp-stat">${w.characteristics.AP}</div>
                  <div class="wp-stat">${w.characteristics.D}</div>
                </div>
                `;
                    }
                });

                return html;
            }

            let html = `<div class="weapon-block">`;

            if (Object.keys(rangedGroups).length > 0) {
                html += renderWeaponSection("Ranged Weapons", rangedGroups, false);
            }

            if (Object.keys(meleeGroups).length > 0) {
                html += renderWeaponSection("Melee Weapons", meleeGroups, true);
            }

            html += `</div>`;
            card.innerHTML += html;

            // Separator after weapons
            card.innerHTML += `<div class="section-separator"></div>`;
        }


        // -------------------------------------------------------
        // ABILITIES
        // -------------------------------------------------------

        const removeRules = [/^Invulnerable Save/i, /^Feel No Pain/i];

        function filterAbilities(list) {
            return list.filter(a => !removeRules.some(r => r.test(a)));
        }

        const unique = filterAbilities(unit.uniqueAbilities);
        const generic = filterAbilities(unit.genericAbilities);

        if (unique.length || generic.length) {
            const uniqueHTML = unique.map(a => `<span class="ability-unique">${a}</span>`).join(", ");
            const genericHTML = generic.map(a => `<span class="ability-generic">${a}</span>`).join(", ");

            card.innerHTML += `
                <div class="inline-section">
                    <span class="inline-title">ABILITIES:</span>
                    ${uniqueHTML}${unique.length && generic.length ? ", " : ""}${genericHTML}
                </div>
            `;
            card.innerHTML += `<div class="section-separator"></div>`;
        }





        // -------------------------------------------------------
        // INLINE WARGEAR
        // -------------------------------------------------------
        if (unit.wargear.length > 0) {
            const items = unit.wargear.map(w =>
                w.count > 1 ? `${w.name} ×${w.count}` : w.name
            );

            card.innerHTML += `
                <div class="inline-section">
                    <span class="inline-title">WARGEAR:</span>
                    ${items.join(", ")}
                </div>
            `;

            card.innerHTML += `<div class="section-separator"></div>`;
        }


        // -------------------------------------------------------
        // 6. ENHANCEMENTS
        // -------------------------------------------------------

        if (unit.enhancements.length > 0) {
            const items = unit.enhancements.map(e =>
                e.count > 1 ? `${e.name} ×${e.count}` : e.name
            );

            card.innerHTML += `
                <div class="inline-section">
                <span class="inline-title">ENHANCEMENTS:</span>
                ${items.join(", ")}
                </div>
            `;

            // Separator after enhancements
            card.innerHTML += `<div class="section-separator"></div>`;
        }

        // -------------------------------------------------------
        // KEYWORDS (no title, italic text)
        // -------------------------------------------------------
        if (unit.keywords?.length > 0) {
            card.innerHTML += `
    <div class="keywords-text">
      ${unit.keywords.join(", ")}
    </div>
  `;
        }


        container.appendChild(card);
    });
}
