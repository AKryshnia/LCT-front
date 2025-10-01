// src/shared/lib/exporters.ts
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

type ExportOpts = {
  fileName?: string;
  scale?: number;           
  background?: string;      
};

function download(dataUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportPNG(el: HTMLElement, opts: ExportOpts = {}) {
  const { fileName = 'report.png', scale = 2, background = '#ffffff' } = opts;

  const dataUrl = await toPng(el, {
    pixelRatio: scale,
    backgroundColor: background,
    cacheBust: true,
    width: el.scrollWidth,
    height: el.scrollHeight,
  });

  download(dataUrl, fileName);
}

export async function exportPDF(el: HTMLElement, opts: ExportOpts = {}) {
  const { fileName = 'report.pdf', scale = 2, background = '#ffffff' } = opts;

  const dataUrl = await toPng(el, {
    pixelRatio: scale,
    backgroundColor: background,
    cacheBust: true,
    width: el.scrollWidth,
    height: el.scrollHeight,
    // useCORS: true,
  });

  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const orientation = img.width >= img.height ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [img.width, img.height],
    compress: true,
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height, undefined, 'FAST');
  pdf.save(fileName);
}
