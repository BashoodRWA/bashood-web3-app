const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

console.log('📄 Generando PDF del Dossier Distribuidor COMPLETO...\n');

// Leer el archivo markdown
const markdownPath = path.join(__dirname, '..', 'pilot-assets', 'DOSSIER_DISTRIBUIDOR_COMPLETO.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf-8');

// Convertir markdown a HTML
const contentHTML = marked.parse(markdownContent);

// Template HTML con estilos profesionales
const template = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BASHOOD - Programa Profesional Comercialización - Completo v2.1</title>
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
            background: #ffffff;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }

        /* Portada */
        .cover-header {
            text-align: center;
            padding: 60px 0;
            border-bottom: 4px solid #16a34a;
            margin-bottom: 40px;
        }

        .cover-title {
            font-size: 32px;
            font-weight: bold;
            color: #16a34a;
            margin-bottom: 20px;
        }

        .cover-subtitle {
            font-size: 20px;
            color: #15803d;
            margin-bottom: 30px;
        }

        .cover-meta {
            font-size: 14px;
            color: #6b7280;
        }

        /* Headings */
        h1 {
            color: #16a34a;
            font-size: 28px;
            margin: 40px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 4px solid #22c55e;
            page-break-after: avoid;
        }

        h2 {
            color: #15803d;
            font-size: 22px;
            margin: 35px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #86efac;
            page-break-after: avoid;
        }

        h3 {
            color: #166534;
            font-size: 18px;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
        }

        h4 {
            color: #14532d;
            font-size: 16px;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }

        /* Párrafos */
        p {
            margin: 12px 0;
            text-align: justify;
        }

        /* Listas */
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }

        li {
            margin: 8px 0;
        }

        /* Tablas */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
            page-break-inside: avoid;
        }

        thead {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            color: white;
        }

        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #16a34a;
        }

        td {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
        }

        tbody tr:nth-child(even) {
            background-color: #f0fdf4;
        }

        tbody tr:hover {
            background-color: #dcfce7;
        }

        /* Código */
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #dc2626;
        }

        pre {
            background: #1f2937;
            color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            page-break-inside: avoid;
        }

        pre code {
            background: transparent;
            color: #f9fafb;
            padding: 0;
        }

        /* Blockquotes */
        blockquote {
            border-left: 4px solid #16a34a;
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            color: #4b5563;
        }

        /* Líneas horizontales */
        hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 30px 0;
        }

        /* Cajas de advertencia */
        .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 6px solid #f59e0b;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
            page-break-inside: avoid;
        }

        .warning-box strong {
            color: #92400e;
            display: block;
            margin-bottom: 8px;
        }

        /* Emojis en encabezados */
        h1::before,
        h2::before,
        h3::before {
            margin-right: 8px;
        }

        /* Links */
        a {
            color: #16a34a;
            text-decoration: none;
            border-bottom: 1px dotted #16a34a;
        }

        a:hover {
            color: #15803d;
            border-bottom: 1px solid #15803d;
        }

        /* Strong y emphasis */
        strong {
            color: #166534;
            font-weight: 600;
        }

        em {
            font-style: italic;
            color: #374151;
        }

        /* Checkbox items */
        li:has(input[type="checkbox"]) {
            list-style: none;
            margin-left: -20px;
        }

        input[type="checkbox"] {
            margin-right: 8px;
        }

        /* Success boxes */
        .success-box {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border-left: 6px solid #16a34a;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
            page-break-inside: avoid;
        }

        /* Imágenes */
        img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
        }

        /* Footer página */
        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: #f9fafb;
            border-top: 2px solid #16a34a;
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #6b7280;
        }

        /* Print styles */
        @media print {
            body {
                max-width: 100%;
                padding: 0;
            }

            .page-footer {
                position: fixed;
                bottom: 0;
            }

            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }

            table, figure, pre, blockquote {
                page-break-inside: avoid;
            }

            .warning-box,
            .success-box {
                page-break-inside: avoid;
            }

            /* Asegurar que las advertencias se impriman con fondo */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        /* Detección de advertencias para styling especial */
        p:has(strong:first-child) {
            font-weight: 500;
        }

        /* Secciones especiales */
        .index-section {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        /* Dividers de partes */
        h1[id*="parte"] {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            border: none;
            margin: 50px 0 30px 0;
        }
    </style>
</head>
<body>
    <div class="cover-header">
        <div class="cover-title">🤝 PROGRAMA PROFESIONAL DE COMERCIALIZACIÓN BASHOOD RWA</div>
        <div class="cover-subtitle">Distribución de Servicios de Tokenización de Activos Industriales</div>
        <div class="cover-meta">
            <p><strong>Versión:</strong> 2.1 (Completa - Revisión Legal y Regulatoria)</p>
            <p><strong>Fecha:</strong> Febrero 2026</p>
            <p><strong>Contacto:</strong> distributors@bashood.io</p>
        </div>
    </div>

    ${contentHTML}

    <div class="page-footer">
        Bashood RWA Technologies | Programa Profesional de Comercialización v2.1 | distributors@bashood.io
    </div>
</body>
</html>
`;

// Crear carpeta html si no existe
const htmlDir = path.join(__dirname, '..', 'pilot-assets', 'html');
if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
}

// Guardar HTML
const outputPath = path.join(htmlDir, 'DOSSIER_DISTRIBUIDOR_COMPLETO.html');
fs.writeFileSync(outputPath, template, 'utf-8');

const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('✅ HTML generado exitosamente');
console.log(`📄 Archivo: ${outputPath}`);
console.log(`📊 Tamaño: ${fileSizeKB} KB`);
console.log('\n🎯 Abriendo en navegador...\n');
console.log('💡 Para generar PDF:');
console.log('   1. Ctrl+P (Imprimir)');
console.log('   2. Destino: \'Guardar como PDF\'');
console.log('   3. Activar \'Gráficos de fondo\'');
console.log('   4. Guardar');
