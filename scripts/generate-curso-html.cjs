const fs = require('fs');
const { marked } = require('marked');
const path = require('path');

// Leer archivo principal
let mdContent = fs.readFileSync('pilot-assets/CURSO_FORMACION_BASHOOD.md', 'utf8');

// Anexar módulos 5-10 si existe archivo de extensión
const extensionPath = 'pilot-assets/CURSO_FORMACION_MODULOS_5_10.md';
if (fs.existsSync(extensionPath)) {
  const extensionContent = fs.readFileSync(extensionPath, 'utf8');
  mdContent = mdContent + '\n\n---\n\n' + extensionContent;
  console.log('✅ Módulos 5-10 completos anexados al curso');
}

// Convertir markdown a HTML
const htmlContent = marked(mdContent);

// Template HTML con estilos profesionales
const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curso Formación Bashood RWA - Programa Completo</title>
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
            line-height: 1.6;
            color: #2c3e50;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: #ffffff;
        }
        
        /* Portada */
        .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: -20px;
            padding: 40px;
            page-break-after: always;
        }
        
        .cover-page h1 {
            font-size: 48px;
            margin: 0 0 20px 0;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .cover-page .emoji {
            font-size: 80px;
            margin-bottom: 30px;
        }
        
        .cover-page .project-name {
            font-size: 32px;
            margin: 20px 0;
            font-weight: 600;
        }
        
        .cover-page .subtitle {
            font-size: 24px;
            margin: 10px 0;
            opacity: 0.95;
        }
        
        .cover-page .duration {
            font-size: 18px;
            margin: 30px 0 10px 0;
            opacity: 0.9;
        }
        
        .cover-page .date {
            font-size: 16px;
            opacity: 0.8;
        }
        
        /* Contenido */
        .content {
            margin-top: 40px;
        }
        
        h1 {
            color: #667eea;
            font-size: 32px;
            margin-top: 40px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            page-break-before: always;
        }
        
        h2 {
            color: #764ba2;
            font-size: 26px;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-left: 10px;
            border-left: 4px solid #764ba2;
        }
        
        h3 {
            color: #5a67d8;
            font-size: 22px;
            margin-top: 25px;
            margin-bottom: 12px;
        }
        
        h4 {
            color: #4c51bf;
            font-size: 18px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
        }
        
        /* Tablas */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        table tbody tr:nth-child(even) {
            background-color: #f7fafc;
        }
        
        table tbody tr:hover {
            background-color: #edf2f7;
        }
        
        /* Listas */
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
            line-height: 1.6;
        }
        
        /* Bloques de código */
        code {
            background: #f7fafc;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #d63031;
        }
        
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }
        
        /* Blockquotes */
        blockquote {
            margin: 20px 0;
            padding: 15px 20px;
            background: #f7fafc;
            border-left: 5px solid #667eea;
            font-style: italic;
            color: #4a5568;
        }
        
        /* Cajas de énfasis */
        .content p:has(> strong:first-child) {
            background: #ebf4ff;
            border-left: 4px solid #4299e1;
            padding: 12px 15px;
            margin: 15px 0;
        }
        
        /* Links */
        a {
            color: #667eea;
            text-decoration: none;
            border-bottom: 1px dotted #667eea;
        }
        
        a:hover {
            color: #764ba2;
            border-bottom-color: #764ba2;
        }
        
        /* Emojis en títulos */
        h1::first-letter,
        h2::first-letter {
            font-size: 1.2em;
        }
        
        /* Impresión */
        @media print {
            body {
                background: white;
            }
            
            .cover-page {
                page-break-after: always;
            }
            
            h1 {
                page-break-before: always;
            }
            
            h1:first-of-type {
                page-break-before: avoid;
            }
            
            table, pre, blockquote {
                page-break-inside: avoid;
            }
        }
        
        /* Estilos específicos para checkboxes */
        .content ul li:has(> input[type="checkbox"]) {
            list-style: none;
            margin-left: -20px;
        }
        
        /* Resaltar secciones importantes */
        .content > p:first-of-type {
            font-size: 18px;
            font-weight: 500;
            color: #2d3748;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="cover-page">
        <div class="emoji">📚</div>
        <h1>CURSO DE FORMACIÓN<br>BASHOOD RWA</h1>
        <div class="project-name">Programa Completo de Capacitación</div>
        <div class="subtitle">Tokenización de Activos Industriales</div>
        <div class="duration">⏱️ Duración: 20-30 horas (10 módulos)</div>
        <div class="subtitle">Formación Distribuidores, Equipo &amp; Partners</div>
        <div class="date">📅 20 de febrero de 2026</div>
    </div>
    
    <div class="content">
        ${htmlContent}
    </div>
    
    <div style="margin-top: 60px; padding: 30px; background: #f7fafc; border-radius: 8px; text-align: center;">
        <h3 style="color: #667eea; margin-top: 0;">🎓 Certificación Bashood RWA</h3>
        <p style="font-size: 16px; color: #4a5568;">
            Para obtener el certificado oficial, debes completar los 10 módulos con nota ≥70% 
            y presentar un proyecto final (pitch deck + role-play negociación).
        </p>
        <p style="font-size: 14px; color: #718096; margin-top: 20px;">
            <strong>Soporte post-curso:</strong> 3 meses coaching incluido<br>
            <strong>Acceso:</strong> Sandbox testnet para práctica ilimitada<br>
            <strong>Materiales:</strong> Templates, CRM, documentación completa
        </p>
    </div>
</body>
</html>`;

// Escribir el archivo HTML
const outputPath = 'pilot-assets/html/09_CURSO_FORMACION_BASHOOD.html';
fs.writeFileSync(outputPath, htmlTemplate);

const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('✅ HTML generado exitosamente');
console.log(`📄 Archivo: ${outputPath}`);
console.log(`📊 Tamaño: ${fileSizeKB} KB`);
console.log('');
console.log('🎯 Abriendo en navegador...');
