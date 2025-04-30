// Entry point for our application
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`GlowbookAPI server running on port ${PORT}`);
});