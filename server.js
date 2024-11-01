const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();

app.get('/', (req, res) => {
    let html = fs.readFileSync(path.join(__dirname, 'test.html'), 'utf8');
    html = html.replace('%NEXT_PUBLIC_GOOGLE_MAPS_API_KEY%', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    res.send(html);
});

app.listen(3000); 