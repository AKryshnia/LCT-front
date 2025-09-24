import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

export async function exportPNG(el: HTMLElement, fileName = 'report.png') {
  const dataUrl = await toPng(el, { pixelRatio: 2 })
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

export async function exportPDF(el: HTMLElement, fileName = 'report.pdf') {
  const dataUrl = await toPng(el, { pixelRatio: 2 })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px' })
  const imgProps = (pdf as any).getImageProperties(dataUrl)
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(fileName)
}
