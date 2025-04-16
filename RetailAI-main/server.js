const express = require('express');
const fs = require('fs').promises; // Using promises API for cleaner code
const path = require('path');
const cors = require('cors');
 


const app = express();
const PORT = 3001;
const LOG_FILE = path.join(__dirname, 'chat_logs.txt');

// Create log file if it doesn't exist
async function initializeLogFile() {
  try {
    await fs.access(LOG_FILE);
  } catch (error) {
    await fs.writeFile(LOG_FILE, '');
    console.log('Created new log file');
  }
}

app.use(cors());
app.use(express.json());

// Enhanced logging endpoint
app.post('/log', async (req, res) => {
    try {
        const { userQuery, botResponse } = req.body;
        if (!userQuery || !botResponse) {
            return res.status(400).json({ message: "Missing userQuery or botResponse" });
        }

        const logEntry = `[${new Date().toISOString()}] User: ${userQuery}\n[${new Date().toISOString()}] Bot: ${botResponse}\n\n`;
        await fs.appendFile(LOG_FILE, logEntry, 'utf8');

        res.status(200).json({ message: "Logged successfully" });
    } catch (error) {
        console.error('Error logging to file:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Enhanced context endpoint
app.get('/get-context', async (req, res) => {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    console.log('Current log file content:', data); // Debug log
    
    const entries = data.split('\n\n').filter(entry => entry.trim());
    const lastThree = entries.slice(-3).join('\n\n');
    
    return res.send(lastThree || 'No conversations found');
  } catch (err) {
    console.error('Error in /get-context endpoint:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Initialize and start server
async function startServer() {
  await initializeLogFile();
  
  app.listen(PORT, () => {
    console.log(`Logging server running on http://localhost:${PORT}`);
    console.log(`Log file location: ${LOG_FILE}`);
    console.log('To test logging, run:');
    console.log(`curl -X POST http://localhost:${PORT}/log -H "Content-Type: application/json" -d '{"userQuery":"test","botResponse":"test"}'`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});