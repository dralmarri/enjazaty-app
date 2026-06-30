/**
 * Web-only helper: render report HTML to a real PDF Blob using html2canvas +
 * jsPDF. Used so the web app can SHARE the achievements report as a PDF file
 * (the native app already produces a PDF via expo-print).
 *
 * The heavy libs are loaded dynamically so they only ship to / run on web.
 */

/** Render an HTML body string into a multi-page A4 PDF Blob. */
export async function htmlToPdfBlob(bodyHtml: string): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // Off-screen container holding the report markup (RTL-aware).
  const container = document.createElement('div');
  container.setAttribute('dir', 'rtl');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px', // ~ A4 width @ 96dpi
    background: '#ffffff',
  });
  container.innerHTML = bodyHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    // Add extra pages for tall reports.
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}
