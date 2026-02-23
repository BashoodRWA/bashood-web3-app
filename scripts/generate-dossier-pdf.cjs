const fs = require('fs');
const { marked } = require('marked');
const path = require('path');

console.log('📄 Generando PDF del Dossier Distribuidor...\n');

// Leer archivo markdown
const mdContent = fs.readFileSync('pilot-assets/DOSSIER_DISTRIBUIDOR.md', 'utf8');

// Convertir markdown a HTML
const htmlContent = marked(mdContent);

// Template HTML con estilos profesionales
const template = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Programa Profesional de Comercialización Bashood RWA</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        h1 {
            color: #16a34a;
            font-size: 2.2em;
            margin: 30px 0 10px 0;
            padding-bottom: 15px;
            border-bottom: 4px solid #22c55e;
            page-break-after: avoid;
        }
        
        h2 {
            color: #15803d;
            font-size: 1.8em;
            margin: 40px 0 15px 0;
            padding-top: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #86efac;
            page-break-after: avoid;
        }
        
        h3 {
            color: #166534;
            font-size: 1.4em;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
        }
        
        h4 {
            color: #14532d;
            font-size: 1.2em;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
            orphans: 3;
            widows: 3;
        }
        
        strong {
            color: #16a34a;
            font-weight: 600;
        }
        
        em {
            color: #15803d;
            font-style: italic;
        }
        
        ul, ol {
            margin: 15px 0 15px 25px;
        }
        
        li {
            margin: 8px 0;
            line-height: 1.6;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: avoid;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        thead {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #d1fae5;
        }
        
        td {
            padding: 10px;
            border: 1px solid #d1fae5;
        }
        
        tbody tr:nth-child(even) {
            background-color: #f0fdf4;
        }
        
        tbody tr:hover {
            background-color: #dcfce7;
        }
        
        pre {
            background: #f9fafb;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            page-break-inside: avoid;
        }
        
        code {
            background: #f0fdf4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #15803d;
        }
        
        pre code {
            background: transparent;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid #fbbf24;
            background: #fffbeb;
            padding: 15px 20px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            page-break-inside: avoid;
        }
        
        hr {
            border: none;
            border-top: 2px solid #d1fae5;
            margin: 30px 0;
            page-break-after: avoid;
        }
        
        .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 6px solid #f59e0b;
            padding: 20px;
            margin: 25px 0;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
            page-break-inside: avoid;
        }
        
        .warning-box p {
            color: #78350f;
            font-weight: 500;
            margin: 0;
        }
        
        .success-box {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border-left: 6px solid #16a34a;
            padding: 20px;
            margin: 25px 0;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.2);
            page-break-inside: avoid;
        }
        
        .success-box p {
            color: #14532d;
            font-weight: 500;
            margin: 0;
        }
        
        /* Advertencias especiales */
        p:has(strong:first-child) {
            background: #fef3c7;
            padding: 12px 15px;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            margin: 15px 0;
        }
        
        /* Header primera página */
        .cover-header {
            text-align: center;
            padding: 60px 0 40px 0;
            border-bottom: 5px solid #22c55e;
            margin-bottom: 50px;
            page-break-after: always;
        }
        
        .cover-title {
            font-size: 3em;
            color: #16a34a;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        .cover-subtitle {
            font-size: 1.5em;
            color: #15803d;
            margin-bottom: 30px;
        }
        
        .cover-meta {
            color: #6b7280;
            font-size: 1.1em;
            margin-top: 40px;
        }
        
        /* Footer en todas las páginas */
        .page-footer {
            position: fixed;
            bottom: 1cm;
            left: 2cm;
            right: 2cm;
            text-align: center;
            font-size: 0.8em;
            color: #9ca3af;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
        }
        
        /* Estilos de impresión */
        @media print {
            body {
                padding: 0;
                background: white;
            }
            
            h1, h2, h3, h4 {
                page-break-after: avoid;
            }
            
            table, pre, blockquote {
                page-break-inside: avoid;
            }
            
            .warning-box, .success-box {
                page-break-inside: avoid;
            }
            
            a {
                color: #16a34a;
                text-decoration: none;
            }
            
            a[href]:after {
                content: none;
            }
        }
        
        /* Emojis reemplazados por símbolos Unicode */
        .emoji {
            font-family: 'Segoe UI Symbol', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;
        }
    </style>
</head>
<body>
    <div class="cover-header">
        <div class="cover-title">🤝 PROGRAMA PROFESIONAL DE COMERCIALIZACIÓN BASHOOD RWA</div>
        <div class="cover-subtitle">Distribución de Servicios de Tokenización de Activos Industriales</div>
        <div class="cover-meta">
            <p><strong>Versión:</strong> 2.0 (Revisión Legal y Regulatoria)</p>
            <p><strong>Fecha:</strong> Febrero 2026</p>
            <p><strong>Contacto:</strong> distributors@bashood.io</p>
        </div>
    </div>
    
    ${htmlContent}
    
    <div class="page-footer">
        Bashood RWA Technologies | Programa Profesional de Comercialización | distributors@bashood.io
    </div>
</body>
</html>`;

// Guardar HTML
const outputPath = path.join('pilot-assets', 'html', 'DOSSIER_DISTRIBUIDOR.html');

// Crear carpeta si no existe
if (!fs.existsSync('pilot-assets/html')) {
    fs.mkdirSync('pilot-assets/html', { recursive: true });
}

fs.writeFileSync(outputPath, template, 'utf8');

const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('✅ HTML generado exitosamente');
console.log(`📄 Archivo: ${outputPath}`);
console.log(`📊 Tamaño: ${fileSizeKB} KB`);
console.log('\n🎯 Abriendo en navegador...');
console.log('\n💡 Para generar PDF:');
console.log('   1. Ctrl+P (Imprimir)');
console.log('   2. Destino: "Guardar como PDF"');
console.log('   3. Activar "Gráficos de fondo"');
console.log('   4. Guardar\n');
