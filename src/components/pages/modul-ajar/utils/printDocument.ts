/**
 * Opens the browser print dialog for a Modul Ajar document in its own window,
 * with page rules for A4 or F4. Returns false when the browser blocked the
 * pop-up window.
 */
export const printModulAjarHtml = (html: string, paperSize: 'A4' | 'F4' | undefined): boolean => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return false;

  printWindow.document.write('<html><head><title>Cetak Modul Ajar</title>');
  const isF4 = paperSize === 'F4';
  printWindow.document.write(`
    <style>
      @page {
        size: ${isF4 ? '215mm 330mm' : 'A4'};
        margin: 1.4cm 1.5cm;
      }
      body {
        font-family: 'Times New Roman', Times, serif;
        padding: 0;
        margin: 0;
        color: #000000;
        background-color: #ffffff;
        line-height: 1.5;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0.8rem;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      td[style*="justify"], td [style*="justify"] {
        text-align: left !important;
      }
      .signature-block {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 16px !important;
      }
      .keep-with-next, h1, h2, h3, h4, .section-header {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      @media print {
        body {
          font-family: 'Times New Roman', Times, serif;
          background-color: #ffffff;
          color: #000000;
          padding: 0;
          margin: 0;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .keep-with-next, h1, h2, h3, h4 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        td[style*="background-color: #0d6b3e"], div[style*="background-color: #0d6b3e"] {
          background-color: #0d6b3e !important;
          color: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        td[style*="background-color: #f5f0d0"], div[style*="background-color: #f5f0d0"] {
          background-color: #f5f0d0 !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  `);
  printWindow.document.write('</head><body>');
  printWindow.document.write(html);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => printWindow.close();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.error('Gagal mencetak:', e);
    }
  }, 500);
  return true;
};
