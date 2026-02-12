// Weapon keyword shorthand map

function cleanDescription(text) {
    if (!text) return "";

    return text
        // Remove ^^ markers
        .replace(/\^\^/g, "")
        // Remove **bold** markers
        .replace(/\*\*/g, "")
        // Remove __underline__ markers (just in case)
        .replace(/__/g, "")
        // Trim leftover whitespace
        .trim();
}

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
    "Anti": "A",
    "One Shot": "OS",
    "Psychic": "Psy",
    "Conversion": "Cv"
};

function convertKeywordToShorthand(keyword) {
    keyword = keyword.trim();

    if (keyword.startsWith("Anti-")) {
        let rest = keyword.replace("Anti-", "")
            .replace(/\u2011|\u2012|\u2013|\u2014/g, "-")
            .replace(/\s+/g, " ")
            .trim();

        const parts = rest.split(" ").filter(p => p.length);

        const target = parts[0];
        let value = parts[1] || "";

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

    const match = keyword.match(/^(.*?)(\d[\d\+]*)$/);
    if (match) {
        const base = match[1].trim();
        const num = match[2].trim();
        const code = keywordShorthand[base] || base;
        return `${code}-${num}`;
    }

    return keywordShorthand[keyword] || keyword;
}

function renderCards(data) {
    const container = document.getElementById("card-inner");
    container.innerHTML = "";

    data.forEach(unit => {
        const card = document.createElement("div");
        card.className = "card";

        // -------------------------------------------------------
        // 1. NAME + BADGES
        // -------------------------------------------------------

        let invuln = null;
        unit.uniqueAbilities.forEach(a => {
            const match = a.name.match(/Invulnerable Save\s*(\d\+)/i);
            if (match) invuln = match[1];
        });

        let fnp = null;
        unit.uniqueAbilities.forEach(a => {
            const match = a.name.match(/Feel No Pain\s*(\d\+)/i);
            if (match) fnp = match[1];
        });
        if (!fnp) {
            unit.genericAbilities.forEach(a => {
                const match = a.name.match(/Feel No Pain\s*(\d\+)/i);
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
            </div>
        `;

        card.innerHTML += headerHTML;

        // -------------------------------------------------------
        // 2. CHARACTERISTICS
        // -------------------------------------------------------

        const showNames = unit.characteristics.length > 1;

        unit.characteristics.forEach((profile, index) => {
            if (showNames) {
                card.innerHTML += `<div class="model-name">${profile.name}</div>`;
            }

            if (index === 0) {
                card.innerHTML += `
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

            card.innerHTML += `
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

        card.innerHTML += `<div class="section-separator"></div>`;

        // -------------------------------------------------------
        // 3. WEAPONS
        // -------------------------------------------------------

        if (unit.weapons.length > 0) {

            const ranged = [];
            const melee = [];

            unit.weapons.forEach(w => {
                if (w.type === "Melee Weapons") melee.push(w);
                else ranged.push(w);
            });

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

            function renderKeywordSpans(keywordString) {
                if (!keywordString || keywordString === "-") return "";

                const parts = keywordString.split(",").map(k => k.trim()).filter(k => k.length);
                const shorthandParts = parts.map(k => convertKeywordToShorthand(k));

                const spans = shorthandParts.map(k =>
                    `<span class="wp-keyword">${k}</span>`
                ).join(", ");

                return `<span class="wp-keywords-inline">${spans}</span>`;
            }

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

                    if (profiles.length > 1) {
                        html += `<div class="weapon-parent">${baseName}</div>`;

                        profiles.forEach(w => {
                            const profileName = w.name.includes(" - ")
                                ? w.name.split(" - ")[1]
                                : "";

                            const range = isMelee ? "M" : w.characteristics.Range;
                            const hitStat = isMelee ? w.characteristics.WS : w.characteristics.BS;

                            const keywordHtml = renderKeywordSpans(w.characteristics.Keywords);

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

            card.innerHTML += `<div class="section-separator"></div>`;
        }

        // -------------------------------------------------------
        // 4. ABILITIES (unique first, generic second)
        // -------------------------------------------------------

        const removeRules = [/^Invulnerable Save/i, /^Feel No Pain/i];

        function filterAbilities(list) {
            return list.filter(a => !removeRules.some(r => r.test(a.name)));
        }

        const unique = filterAbilities(unit.uniqueAbilities);
        const generic = filterAbilities(unit.genericAbilities);

        const showDesc = document.getElementById("showDescriptions")?.checked;

        // UNIQUE abilities
        let uniqueHTML = "";
        if (unique.length > 0) {
            if (showDesc) {
                uniqueHTML = unique.map(a => `
                    <div class="ability-unique">
                        <strong>${a.name}:</strong> 
                        <span class="ability-desc">${cleanDescription(a.description) || ""}</span>
                    </div>
                `).join("");
            } else {
                uniqueHTML = `
                    <div class="ability-unique">
                        ${unique.map(a => a.name).join(", ")}
                    </div>
                `;
            }
        }

        // GENERIC abilities (names only)
        let genericHTML = "";
        if (generic.length > 0) {
            genericHTML = `
                <div class="ability-generic">
                    ${generic.map(a => a.name).join(", ")}
                </div>
            `;
        }

        if (uniqueHTML || genericHTML) {
            card.innerHTML += `
                <div class="inline-section">
                    <span class="inline-title">ABILITIES:</span>
                    ${uniqueHTML}
                    ${showDesc && uniqueHTML && genericHTML ? "<br>" : ""}
                    ${genericHTML}
                </div>
            `;
            card.innerHTML += `<div class="section-separator"></div>`;
        }

        // -------------------------------------------------------
        // 5. WARGEAR
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
        // 6. ENHANCEMENTS (same rules as unique abilities)
        // -------------------------------------------------------

        if (unit.enhancements.length > 0) {
            let enhancementsHTML = "";

            if (showDesc) {
                enhancementsHTML = unit.enhancements.map(e => `
                    <div class="ability-generic">
                        <strong>${e.name}:</strong> 
                        <span class="ability-desc">${cleanDescription(e.description) || ""}</span>
                    </div>
                `).join("");
            } else {
                enhancementsHTML = `
                    <div class="ability-generic">
                        ${unit.enhancements.map(e => e.name).join(", ")}
                    </div>
                `;
            }

            card.innerHTML += `
                <div class="inline-section">
                    <span class="inline-title">ENHANCEMENTS:</span>
                    ${enhancementsHTML}
                </div>
            `;

            card.innerHTML += `<div class="section-separator"></div>`;
        }

        // -------------------------------------------------------
        // 7. KEYWORDS
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

    // Enable PDF + Description buttons
    document.getElementById("pdfButton").classList.remove("disabled");

}
