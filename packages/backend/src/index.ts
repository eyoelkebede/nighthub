import express from 'express';

const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('Hello from the Nighthub Backend!');
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});