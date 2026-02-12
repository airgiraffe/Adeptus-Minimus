document.getElementById("pdfButton").addEventListener("click", async (e) => {
  if (e.currentTarget.classList.contains("disabled")) return;

  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";

  try {
    await generatePDF();
  } finally {
    overlay.style.display = "none";
  }
});

async function generatePDF() {
  const { jsPDF } = window.jspdf;

  // Ensure fonts are ready
  await document.fonts.ready;

  const cards = document.querySelectorAll(".card");
  if (cards.length === 0) return;

  // First pass: measure DOM sizes
  let maxDomHeight = 0;
  let domWidth = cards[0].offsetWidth;

  cards.forEach(card => {
    const h = card.offsetHeight;
    if (h > maxDomHeight) maxDomHeight = h;
  });

  // PDF width in inches
  const pdfWidthIn = 2.75;
  const pdfWidthPt = pdfWidthIn * 72;

  // Scale factor based on DOM width
  const scale = pdfWidthPt / domWidth;

  // PDF height based on tallest DOM card
  const pdfHeightPt = maxDomHeight * scale;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [pdfWidthPt, pdfHeightPt]
  });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // Render card to canvas
    const canvas = await html2canvas(card, {
      scale: 4,
      useCORS: true,
      backgroundColor: null
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const scaledWidth = pdfWidthPt;
    const scaledHeight = (canvasHeight / canvasWidth) * scaledWidth;

    const imgData = canvas.toDataURL("image/png");

    if (i > 0) pdf.addPage([pdfWidthPt, pdfHeightPt]);

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      scaledWidth,
      scaledHeight
    );
  }

  pdf.save("warhammer-cards.pdf");
}
