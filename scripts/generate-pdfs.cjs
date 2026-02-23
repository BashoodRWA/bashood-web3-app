/**
 * Script para generar PDFs de la documentación piloto Doosan DX360
 * 
 * Genera PDFs profesionales de todos los documentos de negociación
 * para enviar al propietario del activo.
 */

const { mdToPdf } = require('md-to-pdf');
const fs = require('fs');
const path = require('path');

// Configuración PDFs
const PDF_CONFIG = {
  pdf_options: {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  },
  stylesheet: `
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    h2 {
      color: #34495e;
      border-bottom: 2px solid #95a5a6;
      padding-bottom: 5px;
      margin-top: 25px;
    }
    h3 {
      color: #555;
      margin-top: 20px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #3498db;
    }
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 15px;
      margin-left: 0;
      color: #555;
      font-style: italic;
    }
    .page-break {
      page-break-after: always;
    }
    @media print {
      .no-print {
        display: none;
      }
    }
  `
};

// Documentos a convertir
const DOCUMENTS = [
  {
    name: 'Propuesta de Tokenización',
    input: 'pilot-assets/PROPUESTA_TOKENIZACION.md',
    output: 'pilot-assets/pdf/01_PROPUESTA_TOKENIZACION.pdf',
    addCover: true
  },
  {
    name: 'Due Diligence Checklist',
    input: 'pilot-assets/DUE_DILIGENCE_CHECKLIST.md',
    output: 'pilot-assets/pdf/02_DUE_DILIGENCE_CHECKLIST.pdf',
    addCover: true
  },
  {
    name: 'Guion de Llamada',
    input: 'pilot-assets/GUION_LLAMADA.md',
    output: 'pilot-assets/pdf/03_GUION_LLAMADA.pdf',
    addCover: true
  },
  {
    name: 'Términos Contractuales (Borrador)',
    input: 'pilot-assets/TERMINOS_CONTRACTUALES_BORRADOR.md',
    output: 'pilot-assets/pdf/04_TERMINOS_CONTRACTUALES_BORRADOR.pdf',
    addCover: true
  },
  {
    name: 'Índice Maestro',
    input: 'pilot-assets/README.md',
    output: 'pilot-assets/pdf/00_INDICE_MAESTRO.pdf',
    addCover: true
  }
];

/**
 * Generar portada para PDF
 */
function generateCover(documentName) {
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
<div style="text-align: center; padding-top: 200px;">
  <h1 style="font-size: 32pt; color: #2c3e50; border: none;">
    ${documentName}
  </h1>
  <p style="font-size: 18pt; color: #7f8c8d; margin-top: 30px;">
    Proyecto Bashood RWA
  </p>
  <p style="font-size: 16pt; color: #95a5a6; margin-top: 20px;">
    Activo Piloto: Doosan DX360
  </p>
  <p style="font-size: 14pt; color: #bdc3c7; margin-top: 60px;">
    ${date}
  </p>
  <p style="font-size: 12pt; color: #bdc3c7; margin-top: 40px;">
    Confidencial - Solo para uso del destinatario
  </p>
</div>
<div class="page-break"></div>
  `.trim();
}

/**
 * Agregar marca de agua en footer
 */
function addFooter() {
  return `
<div style="position: fixed; bottom: 10px; right: 20px; font-size: 9pt; color: #bdc3c7;">
  Bashood RWA - 2026
</div>
  `.trim();
}

/**
 * Generar un PDF individual
 */
async function generatePDF(doc) {
  try {
    console.log(`\n📄 Generando PDF: ${doc.name}...`);
    
    // Verificar que existe el archivo MD
    if (!fs.existsSync(doc.input)) {
      console.error(`   ❌ Archivo no encontrado: ${doc.input}`);
      return false;
    }
    
    // Leer contenido markdown
    let content = fs.readFileSync(doc.input, 'utf8');
    
    // Agregar portada si se solicita
    if (doc.addCover) {
      const cover = generateCover(doc.name);
      content = cover + '\n\n' + content;
    }
    
    // Crear directorio output si no existe
    const outputDir = path.dirname(doc.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generar PDF
    const pdf = await mdToPdf(
      { content },
      {
        ...PDF_CONFIG,
        dest: doc.output
      }
    );
    
    if (pdf) {
      const stats = fs.statSync(doc.output);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   ✅ Generado exitosamente: ${doc.output}`);
      console.log(`   📊 Tamaño: ${fileSizeKB} KB`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`   ❌ Error generando PDF: ${error.message}`);
    return false;
  }
}

/**
 * Generar PDF completo (todos los docs combinados)
 */
async function generateCompletePDF() {
  try {
    console.log(`\n📚 Generando PDF COMPLETO (todos los documentos)...`);
    
    let combinedContent = generateCover('Documentación Completa - Piloto Doosan DX360');
    
    // Agregar índice de documentos
    combinedContent += '\n\n# 📑 Índice de Documentos\n\n';
    DOCUMENTS.forEach((doc, idx) => {
      combinedContent += `${idx + 1}. **${doc.name}**\n`;
    });
    combinedContent += '\n<div class="page-break"></div>\n\n';
    
    // Combinar todos los documentos
    for (const doc of DOCUMENTS) {
      if (fs.existsSync(doc.input)) {
        console.log(`   📄 Incluyendo: ${doc.name}`);
        
        const content = fs.readFileSync(doc.input, 'utf8');
        
        // Agregar separador de documento
        combinedContent += `\n\n---\n\n`;
        combinedContent += `# 📄 ${doc.name.toUpperCase()}\n\n`;
        combinedContent += content;
        combinedContent += '\n\n<div class="page-break"></div>\n\n';
      }
    }
    
    // Generar PDF completo
    const outputPath = 'pilot-assets/pdf/DOOSAN_DX360_DOCUMENTACION_COMPLETA.pdf';
    
    const pdf = await mdToPdf(
      { content: combinedContent },
      {
        ...PDF_CONFIG,
        dest: outputPath
      }
    );
    
    if (pdf) {
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   ✅ PDF completo generado: ${outputPath}`);
      console.log(`   📊 Tamaño: ${fileSizeMB} MB`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`   ❌ Error generando PDF completo: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 GENERADOR DE PDFs - PILOTO DOOSAN DX360');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  // Generar PDFs individuales
  console.log('📋 GENERANDO PDFs INDIVIDUALES...\n');
  
  let successCount = 0;
  for (const doc of DOCUMENTS) {
    const success = await generatePDF(doc);
    if (success) successCount++;
  }
  
  console.log(`\n✅ PDFs individuales generados: ${successCount}/${DOCUMENTS.length}`);
  
  // Generar PDF completo
  console.log('\n═══════════════════════════════════════════════════════════');
  const completeSuccess = await generateCompletePDF();
  
  // Resumen final
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL\n');
  console.log(`   PDFs individuales: ${successCount}/${DOCUMENTS.length}`);
  console.log(`   PDF completo: ${completeSuccess ? '✅' : '❌'}`);
  console.log(`   Tiempo total: ${duration}s`);
  console.log(`   Ubicación: pilot-assets/pdf/\n`);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📁 ARCHIVOS GENERADOS:\n');
  
  // Listar todos los PDFs generados
  if (fs.existsSync('pilot-assets/pdf')) {
    const pdfFiles = fs.readdirSync('pilot-assets/pdf').filter(f => f.endsWith('.pdf'));
    pdfFiles.sort().forEach(file => {
      const filePath = path.join('pilot-assets/pdf', file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   📄 ${file} (${sizeKB} KB)`);
    });
  }
  
  console.log('\n✅ Generación de PDFs completada.');
  console.log('💡 Puedes encontrar todos los PDFs en: pilot-assets/pdf/');
  console.log('\n🚀 Para enviar al propietario:');
  console.log('   - Usa PDFs individuales (más ligeros)');
  console.log('   - O envía PDF completo (todo en uno)');
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
