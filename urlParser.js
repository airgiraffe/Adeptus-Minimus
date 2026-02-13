let currentRoster = null;

function decodeListForgeData(encodedString) {
    // 1. Base64 decode → bytes
    const binaryString = atob(encodedString);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Inflate full GZIP stream
    const decompressed = pako.inflate(bytes, { to: 'string' });

    // 3. Parse JSON
    return JSON.parse(decompressed);
}


window.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash;

    if (hash.startsWith("#/listforge-json/")) {
        const encoded = hash.substring("#/listforge-json/".length);

        const json = decodeListForgeData(encoded);

        // NEW: store raw roster globally
        currentRoster = json;

        const cleaned = parseRoster(json);

        // NEW: store cleaned roster globally too
        cleanedData = cleaned;
        window.cleanedData = cleaned;

        renderCards(cleaned);

        document.getElementById("pdfButton").classList.remove("disabled");
    }
});


