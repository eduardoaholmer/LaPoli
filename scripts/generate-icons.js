const fs = require('fs');
const path = require('path');

// Ler o SVG
const svg192 = fs.readFileSync(path.join(__dirname, '../public/icon-192.svg'), 'utf8');
const svg512 = fs.readFileSync(path.join(__dirname, '../public/icon-512.svg'), 'utf8');

// Criar um HTML temporário para converter SVG para PNG usando canvas
const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; }
    canvas { display: none; }
  </style>
</head>
<body>
  <div id="svg192">${svg192}</div>
  <div id="svg512">${svg512}</div>
  <canvas id="canvas192" width="192" height="192"></canvas>
  <canvas id="canvas512" width="512" height="512"></canvas>
  <script>
    function svgToPng(svgElement, canvas, callback) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = function() {
        canvas.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        callback(canvas.toDataURL('image/png'));
      };
      
      img.src = url;
    }

    svgToPng(document.getElementById('svg192'), document.getElementById('canvas192'), function(data192) {
      svgToPng(document.getElementById('svg512'), document.getElementById('canvas512'), function(data512) {
        window.pngData = { 192: data192, 512: data512 };
      });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'temp.html'), html);

console.log('Para gerar os ícones PNG, abra temp.html em um navegador e salve as imagens geradas.');
console.log('Ou use uma ferramenta online como https://svgtopng.com/');
