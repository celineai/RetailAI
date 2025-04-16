const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// Create an instance of express
const app = express();

// Serve static files (like index.html, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Define the port for the server
const PORT = 3001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  
  // Open the browser automatically
  openInBrowser(`http://localhost:${PORT}`);
});

// Function to open the URL in the default browser
function openInBrowser(url) {
  exec(`start ${url}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error opening browser: ${err.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`Browser opened with ${url}`);
  });
}
