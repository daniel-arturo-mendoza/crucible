// Entry point for the Crucible backend
// TODO: Implement Express server and /query endpoint 

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 