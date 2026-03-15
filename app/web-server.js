const express = require('express');
const path = require('path');
const { createReadStream } = require('fs');

const app = express();
const PORT = 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'web-build')));

// メインのHTMLファイル
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>convert2gabigabi</title>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        #root { height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(\`🚀 Web server running at http://localhost:\${PORT}\`);
  console.log('📱 convert2gabigabi UI is ready!');
}); 