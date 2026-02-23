/**
 * Generador de HTML para imprimir como PDF
 * 
 * Convierte los documentos Markdown a HTML con estilos profesionales
 * que se pueden imprimir directamente a PDF desde el navegador.
 * 
 * Instrucciones:
 * 1. Ejecutar: node scripts/generate-html.cjs
 * 2. Abrir archivos HTML en navegador
 * 3. Ctrl+P → Guardar como PDF
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configurar marked para mejor renderizado
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false
});

// Template HTML con estilos profesionales
const HTML_TEMPLATE = (title, content, documentName) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    
    /* Portada */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      text-align: center;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-size: 32pt;
      color: #2c3e50;
      margin-bottom: 30px;
      border: none;
    }
    
    .cover-page .project-name {
      font-size: 18pt;
      color: #7f8c8d;
      margin: 20px 0;
    }
    
    .cover-page .asset-name {
      font-size: 16pt;
      color: #95a5a6;
      margin: 20px 0;
    }
    
    .cover-page .date {
      font-size: 14pt;
      color: #bdc3c7;
      margin-top: 60px;
    }
    
    .cover-page .confidential {
      font-size: 12pt;
      color: #e74c3c;
      margin-top: 40px;
      font-weight: bold;
    }
    
    /* Encabezados */
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-top: 40px;
      page-break-after: avoid;
    }
    
    h2 {
      color: #34495e;
      border-bottom: 2px solid #95a5a6;
      padding-bottom: 5px;
      margin-top: 30px;
      page-break-after: avoid;
    }
    
    h3 {
      color: #555;
      margin-top: 25px;
      page-break-after: avoid;
    }
    
    h4 {
      color: #666;
      margin-top: 20px;
    }
    
    /* Tablas */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      page-break-inside: avoid;
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
    
    /* Código */
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: #c7254e;
    }
    
    pre {
      background-color: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #3498db;
      page-break-inside: avoid;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #333;
    }
    
    /* Blockquotes */
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 15px;
      margin-left: 0;
      color: #555;
      font-style: italic;
      page-break-inside: avoid;
    }
    
    /* Listas */
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 8px 0;
    }
    
    /* Checkboxes (tareas) */
    input[type="checkbox"] {
      margin-right: 8px;
    }
    
    /* Enlaces */
    a {
      color: #3498db;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Separadores */
    hr {
      border: none;
      border-top: 2px solid #ecf0f1;
      margin: 30px 0;
    }
    
    /* Emojis y símbolos */
    .emoji {
      font-size: 1.2em;
    }
    
    /* Page breaks */
    .page-break {
      page-break-after: always;
    }
    
    /* Header y footer para impresión */
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
      
      table, pre, blockquote {
        page-break-inside: avoid;
      }
      
      /* Footer */
      @page {
        @bottom-right {
          content: "Bashood RWA - 2026";
          font-size: 9pt;
          color: #bdc3c7;
        }
        
        @bottom-left {
          content: "${documentName}";
          font-size: 9pt;
          color: #bdc3c7;
        }
      }
    }
    
    /* Instrucciones imprimir (solo pantalla) */
    .print-instructions {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 300px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    
    @media print {
      .print-instructions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-instructions no-print">
    <h4 style="margin-top:0; color:#856404">📄 Para generar PDF:</h4>
    <ol style="margin:0; padding-left:20px; color:#856404">
      <li>Presiona <strong>Ctrl+P</strong></li>
      <li>Selecciona "Guardar como PDF"</li>
      <li>Ajusta márgenes si es necesario</li>
      <li>Guarda el archivo</li>
    </ol>
  </div>
  
  <div class="cover-page">
    <h1>${documentName}</h1>
    <div class="project-name">Proyecto Bashood RWA</div>
    <div class="asset-name">Activo Piloto: Doosan DX360</div>
    <div class="date">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div class="confidential">☑️ CONFIDENCIAL - Solo para uso del destinatario</div>
  </div>
  
  <div class="content">
    ${content}
  </div>
</body>
</html>
`;

// Documentos a convertir
const DOCUMENTS = [
  {
    name: 'Índice Maestro',
    input: 'pilot-assets/README.md',
    output: 'pilot-assets/html/00_INDICE_MAESTRO.html'
  },
  {
    name: 'Propuesta de Tokenización',
    input: 'pilot-assets/PROPUESTA_TOKENIZACION.md',
    output: 'pilot-assets/html/01_PROPUESTA_TOKENIZACION.html'
  },
  {
    name: 'Due Diligence Checklist',
    input: 'pilot-assets/DUE_DILIGENCE_CHECKLIST.md',
    output: 'pilot-assets/html/02_DUE_DILIGENCE_CHECKLIST.html'
  },
  {
    name: 'Guion de Llamada',
    input: 'pilot-assets/GUION_LLAMADA.md',
    output: 'pilot-assets/html/03_GUION_LLAMADA.html'
  },
  {
    name: 'Términos Contractuales (Borrador)',
    input: 'pilot-assets/TERMINOS_CONTRACTUALES_BORRADOR.md',
    output: 'pilot-assets/html/04_TERMINOS_CONTRACTUALES_BORRADOR.html'
  }
];

/**
 * Generar un HTML individual
 */
function generateHTML(doc) {
  try {
    console.log(`\n📄 Generando HTML: ${doc.name}...`);
    
    // Verificar que existe el archivo MD
    if (!fs.existsSync(doc.input)) {
      console.error(`   ❌ Archivo no encontrado: ${doc.input}`);
      return false;
    }
    
    // Leer contenido markdown
    const markdownContent = fs.readFileSync(doc.input, 'utf8');
    
    // Convertir markdown a HTML
    const htmlContent = marked(markdownContent);
    
    // Crear directorio output si no existe
    const outputDir = path.dirname(doc.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generar HTML completo con template
    const fullHTML = HTML_TEMPLATE(doc.name, htmlContent, doc.name);
    
    // Escribir archivo
    fs.writeFileSync(doc.output, fullHTML, 'utf8');
    
    const stats = fs.statSync(doc.output);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   ✅ Generado exitosamente: ${doc.output}`);
    console.log(`   📊 Tamaño: ${fileSizeKB} KB`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error generando HTML: ${error.message}`);
    return false;
  }
}

/**
 * Generar índice HTML con enlaces a todos los documentos
 */
function generateIndex() {
  try {
    console.log(`\n📑 Generando índice HTML...`);
    
    let indexContent = `
# 📁 Documentación Piloto Doosan DX360

**Proyecto:** Bashood RWA  
**Fecha:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}  
**Status:** Preparado para negociación

---

## 📄 Documentos Disponibles

`;
    
    DOCUMENTS.forEach((doc, idx) => {
      const filename = path.basename(doc.output);
      indexContent += `${idx + 1}. **[${doc.name}](${filename})**\n`;
    });
    
    indexContent += `

---

## 📌 Instrucciones

### Para generar PDFs:

1. **Abrir cada archivo HTML** en tu navegador (Chrome, Edge, Firefox)
2. **Presionar Ctrl+P** (o Cmd+P en Mac)
3. **Seleccionar "Guardar como PDF"** en destino/impresora
4. **Ajustar configuración:**
   - Márgenes: Predeterminados
   - Escala: 100%
   - Fondo de gráficos: Activado
5. **Guardar** con el mismo nombre del archivo HTML

### Archivos recomendados para enviar al propietario:

✅ **01_PROPUESTA_TOKENIZACION.pdf** - Documento comercial principal  
✅ **02_DUE_DILIGENCE_CHECKLIST.pdf** - Lista de documentación requerida  
⚠️ **03_GUION_LLAMADA.pdf** - Solo para uso interno (NO enviar)  
⚠️ **04_TERMINOS_CONTRACTUALES_BORRADOR.pdf** - Enviar solo tras aprobación inicial

---

## 🎯 Flujo Recomendado

1. **Antes de la llamada:** Imprimir/revisar 02_DUE_DILIGENCE_CHECKLIST y 03_GUION_LLAMADA
2. **Durante la llamada:** Seguir guion y anotar respuestas
3. **Después de la llamada:** Enviar 01_PROPUESTA_TOKENIZACION + NDA por email
4. **Si aprobado:** Enviar 04_TERMINOS_CONTRACTUALES_BORRADOR para negociación

---

**Preparado por:** Bashood Team  
**Contacto:** contacto@bashood.io
`;
    
    const htmlContent = marked(indexContent);
    const fullHTML = HTML_TEMPLATE('Índice - Documentación Doosan DX360', htmlContent, 'Índice Documentación');
    
    const outputPath = 'pilot-assets/html/index.html';
    fs.writeFileSync(outputPath, fullHTML, 'utf8');
    
    console.log(`   ✅ Índice generado: ${outputPath}`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error generando índice: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 GENERADOR DE HTML PARA PDF - PILOTO DOOSAN DX360');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  // Generar HTMLs individuales
  console.log('📋 GENERANDO HTMLs INDIVIDUALES...\n');
  
  let successCount = 0;
  for (const doc of DOCUMENTS) {
    const success = generateHTML(doc);
    if (success) successCount++;
  }
  
  console.log(`\n✅ HTMLs generados: ${successCount}/${DOCUMENTS.length}`);
  
  // Generar índice
  console.log('\n═══════════════════════════════════════════════════════════');
  const indexSuccess = generateIndex();
  
  // Resumen final
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN FINAL\n');
  console.log(`   HTMLs generados: ${successCount}/${DOCUMENTS.length}`);
  console.log(`   Índice: ${indexSuccess ? '✅' : '❌'}`);
  console.log(`   Tiempo total: ${duration}s`);
  console.log(`   Ubicación: pilot-assets/html/\n`);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📁 ARCHIVOS GENERADOS:\n');
  
  // Listar todos los HTMLs generados
  if (fs.existsSync('pilot-assets/html')) {
    const htmlFiles = fs.readdirSync('pilot-assets/html').filter(f => f.endsWith('.html'));
    htmlFiles.sort().forEach(file => {
      const filePath = path.join('pilot-assets/html', file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   📄 ${file} (${sizeKB} KB)`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Generación de HTMLs completada.\n');
  console.log('📂 Ubicación: pilot-assets/html/');
  console.log('\n🎯 PRÓXIMOS PASOS:\n');
  console.log('1. Abrir: pilot-assets/html/index.html');
  console.log('2. Hacer clic en cada documento');
  console.log('3. Ctrl+P → Guardar como PDF');
  console.log('4. Repetir para cada documento necesario\n');
  console.log('💡 TIP: Chrome/Edge generan PDFs de mejor calidad que Firefox');
}

// Ejecutar
try {
  main();
} catch (error) {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
}
