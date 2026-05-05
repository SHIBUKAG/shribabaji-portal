const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf';
const dest = path.join(__dirname, '..', 'src', 'assets', 'fontBase64.js');

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const b64 = buffer.toString('base64');
    fs.writeFileSync(dest, `export const NotoSansDevanagariBase64 = "${b64}";\n`);
    console.log('Font successfully encoded to src/assets/fontBase64.js');
  });
}).on('error', (e) => {
  console.error(e);
});
