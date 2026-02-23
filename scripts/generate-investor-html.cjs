const fs = require('fs');
const { marked } = require('marked');

const mdContent = fs.readFileSync('pilot-assets/MODELO_ECONOMICO_INVERSORES.md', 'utf8');
const htmlContent = marked(mdContent);

const template = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modelo Económico para Inversores - Bashood RWA</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
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
    
    .cover-page .date { 
      font-size: 14pt; 
      color: #bdc3c7; 
      margin-top: 60px; 
    }
    
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
    
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 20px 0; 
      page-break-inside: avoid; 
      font-size: 10pt;
    }
    
    th, td { 
      border: 1px solid #ddd; 
      padding: 8px; 
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
      font-size: 9pt; 
      color: #c7254e; 
    }
    
    pre { 
      background-color: #f4f4f4; 
      padding: 15px; 
      border-radius: 5px; 
      overflow-x: auto; 
      border-left: 4px solid #3498db; 
      page-break-inside: avoid; 
      font-size: 9pt;
    }
    
    pre code { 
      background: none; 
      padding: 0; 
      color: #333; 
    }
    
    blockquote { 
      border-left: 4px solid #3498db; 
      padding-left: 15px; 
      margin-left: 0; 
      color: #555; 
      font-style: italic; 
      page-break-inside: avoid; 
    }
    
    ul, ol { 
      margin: 15px 0; 
      padding-left: 30px; 
    }
    
    li { 
      margin: 8px 0; 
    }
    
    a { 
      color: #3498db; 
      text-decoration: none; 
    }
    
    hr { 
      border: none; 
      border-top: 2px solid #ecf0f1; 
      margin: 30px 0; 
    }
    
    @media print { 
      body { padding: 0; } 
      h1, h2, h3 { page-break-after: avoid; } 
      table, pre, blockquote { page-break-inside: avoid; } 
      .print-instructions { display: none; }
    }
    
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
  </style>
</head>
<body>
  <div class="print-instructions">
    <h4 style="margin-top:0; color:#856404">📄 Para generar PDF:</h4>
    <ol style="margin:0; padding-left:20px; color:#856404">
      <li>Presiona <strong>Ctrl+P</strong></li>
      <li>Selecciona "Guardar como PDF"</li>
      <li>Fondo gráficos: ✅ ACTIVADO</li>
      <li>Guarda el archivo</li>
    </ol>
  </div>
  
  <div class="cover-page">
    <h1>💰 Modelo Económico para Inversores</h1>
    <div class="project-name">Proyecto Bashood RWA</div>
    <div class="project-name">Guía Completa de Retornos</div>
    <div class="date">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  
  <div class="content">
    ${htmlContent}
  </div>
</body>
</html>`;

fs.mkdirSync('pilot-assets/html', { recursive: true });
fs.writeFileSync('pilot-assets/html/05_MODELO_ECONOMICO_INVERSORES.html', template);

const stats = fs.statSync('pilot-assets/html/05_MODELO_ECONOMICO_INVERSORES.html');
const sizeKB = (stats.size / 1024).toFixed(2);

console.log('✅ HTML generado exitosamente');
console.log(`📄 Archivo: pilot-assets/html/05_MODELO_ECONOMICO_INVERSORES.html`);
console.log(`📊 Tamaño: ${sizeKB} KB`);
console.log('');
console.log('🎯 Próximo paso: Abrir en navegador y presionar Ctrl+P para guardar como PDF');
