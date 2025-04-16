// DOM Elements
const chatBox = document.getElementById("chat-box");
const inputBox = document.getElementById("user-input");
const submitBtn = document.getElementById("send-btn");
const exportBtn = document.getElementById("export-log-btn");
const clearBtn = document.getElementById("clear-history-btn");


// Logging Variables
let logFileHandle;
let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];
const MAX_LOG_ENTRIES = 500;
const LOGGING_SERVER_URL = 'http://localhost:3001';

// Initialize file system access (cliAent-side)
async function initFileAccess() {
    try {
        if ('showOpenFilePicker' in window) {
            try {
                [logFileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] }
                    }],
                    multiple: false
                });
            } catch (error) {
                logFileHandle = await window.showSaveFilePicker({
                    suggestedName: 'RetailAI_chat_log.txt',
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] }
                    }]
                });
            }
        }
    } catch (error) {
        console.log('File system access not available:', error);
    }
}

// Initialize on load
initFileAccess();

// Helper Functions
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

function saveHistory() {
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
}

// Message Functions
async function appendMessage(message, sender, isGraph = false) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
  const timestamp = getCurrentTime();
  messageDiv.innerHTML = `
      ${message.replace(/\n/g, "<br>")}
      <span class="message-timestamp">${timestamp}</span>
  `;
  
  // Add to chat box
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  
  // Skip logging for graph messages
  if (!isGraph) {
      const entry = {
          timestamp: new Date().toISOString(),
          displayTime: timestamp,
          sender,
          message
      };
      conversationHistory.push(entry);
      
      if (conversationHistory.length > MAX_LOG_ENTRIES) {
          conversationHistory.shift();
      }
      
      saveHistory();
      await logToClientFile(message, sender);
  }
}

// Client-side file logging
async function logToClientFile(message, sender) {
    const entry = `[${new Date().toISOString()}] ${sender}: ${message}\n`;
    
    try {
        if (logFileHandle) {
            const file = await logFileHandle.getFile();
            const contents = await file.text();
            const writable = await logFileHandle.createWritable();
            await writable.write(contents + entry);
            await writable.close();
        }
    } catch (error) {
        console.log('Error writing to client file:', error);
    }
}

// Backend logging
async function logToBackend(userQuery, botResponse) {
    try {
        await fetch(`${LOGGING_SERVER_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userQuery, botResponse })
        });
    } catch (error) {
        console.error('Error logging to backend:', error);
    }
}

// Get conversation context
async function getConversationContext() {
    try {
        const response = await fetch(`${LOGGING_SERVER_URL}/get-context`);
        if (!response.ok) throw new Error('Failed to fetch context');
        return await response.text();
    } catch (error) {
        console.error('Error getting context:', error);
        // Fallback to localStorage context if backend fails
        const lastThree = conversationHistory.slice(-6); // Get last 3 pairs (user+bot)
        return lastThree.map(entry => 
            `[${entry.displayTime}] ${entry.sender}: ${entry.message}`
        ).join('\n');
    }
}

// Graph Function 
// Updated renderGraph function
function renderGraph(graphData) {
    console.log("Graph data received:", graphData);
    
    // Clear previous graph if exists
    const existingCanvas = document.getElementById("graphCanvas");
    if (existingCanvas) existingCanvas.remove();
  
    // Create new canvas
    const canvas = document.createElement("canvas");
    canvas.id = "graphCanvas";
    canvas.style.width = "100%";
    canvas.style.height = "400px";
    canvas.style.margin = "10px 0";
    
    // Add to chat
    chatBox.appendChild(canvas);
  
    try {
      // Create the chart
      new Chart(canvas, {
        type: graphData.type || 'bar',
        data: {
          labels: graphData.labels,
          datasets: [{
            label: graphData.datasets[0].label,
            data: graphData.datasets[0].data,
            backgroundColor: graphData.datasets[0].backgroundColor,
            borderColor: graphData.datasets[0].borderColor || 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Chart rendering error:", error);
      canvas.remove();
      const errorDiv = document.createElement("div");
      errorDiv.className = "message bot-message";
      errorDiv.innerHTML = `
        <strong>Graph Error:</strong> Could not render the chart.<br>
        <details>
          <summary>Technical Details</summary>
          ${error.message}<br>
          Data: ${JSON.stringify(graphData, null, 2)}
        </details>
      `;
      chatBox.appendChild(errorDiv);
    }
  }


// Event Listeners
submitBtn.addEventListener("click", handleSubmit);
inputBox.addEventListener("keypress", (e) => e.key === "Enter" && handleSubmit());

function setPrompt(promptText) {
  inputBox.value = promptText; // Set the prompt text in the input box
  handleSubmit(); // Automatically submit the prompt
}

// [Previous code remains the same until handleSubmit]

async function handleSubmit() {
  const userQuestion = inputBox.value.trim();
  if (!userQuestion) return;

  await appendMessage(userQuestion, "user");
  inputBox.value = "";

  try {
      const response = await fetch('https://cnszgaiw9k.execute-api.us-east-2.amazonaws.com/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userQuestion })
      });

      if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // Debug log

      let responseData;
      try {
          responseData = data.body ? JSON.parse(data.body) : data;
      } catch (parseError) {
          console.error("Error parsing response:", parseError);
          throw new Error("Invalid response format from server");
      }

      // Handle both direct responses and nested body responses
      if (responseData.graphData) {
          await handleGraphResponse(responseData);
      } else if (responseData.message && responseData.message.includes("error")) {
          await handleErrorResponse(responseData);
      } else {
          await handleTextResponse(responseData);
      }

  } catch (error) {
      console.error("API Error:", error);
      await appendMessage(`Sorry, there was an error: ${error.message}`, "bot");
  }
}

  
  async function handleGraphResponse(responseData) {
    try {
      await appendMessage("Here's the visualization of your data:", "bot", true);
      
      // Ensure the graph data is in correct format
      const graphData = {
        type: responseData.graphData.type || 'bar',
        labels: responseData.graphData.labels || [],
        datasets: responseData.graphData.datasets || [{
          label: 'Data',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      };
      
      renderGraph(graphData);
      
      // Optionally add a text summary if available
      if (responseData.message) {
        await appendMessage(responseData.message, "bot");
      }
    } catch (graphError) {
      console.error("Graph rendering error:", graphError);
      await appendMessage("I couldn't display the graph, but here's the data:", "bot");
      await appendMessage(JSON.stringify(responseData.graphData, null, 2), "bot");
    }
  }
  
  async function handleTextResponse(responseData) {
    // Extract the actual data content, prioritizing the 'data' field over 'message'
    let message = responseData.data || 
                 (responseData.message && !responseData.message.includes("Data processed successfully") 
                  ? responseData.message 
                  : "");
    
    // If we still have the unwanted message, try to extract just the content
    if (message.includes("Data processed successfully")) {
      const startIndex = message.indexOf('data: "') + 7;
      const endIndex = message.lastIndexOf('"');
      message = startIndex > 6 && endIndex > startIndex 
        ? message.substring(startIndex, endIndex) 
        : message.replace("Data processed successfully", "").trim();
    }
  
    // Format long responses with line breaks
    if (message.length > 200) {
      message = message.replace(/\n/g, "<br>");
    }
    
    if (message) {
      await appendMessage(message, "bot");
    } else {
      await appendMessage("I received an empty response from the server.", "bot");
    }
  }
  
  async function handleErrorResponse(responseData) {
    let errorMessage = responseData.message;
    
    // If there are suggested fields, format them nicely
    if (responseData.suggestedFields) {
      errorMessage += "<br><br>Available fields: " + 
                     responseData.suggestedFields.join(", ");
    }
    
    // If there's raw data available, show it in a details element
    if (responseData.availableFields) {
      errorMessage += `<details><summary>Show technical details</summary>
                      Available fields in data: ${responseData.availableFields.join(", ")}</details>`;
    }
    
    await appendMessage(errorMessage, "bot");
  }
  
  // [Rest of your existing code remains the same]

// Export function (unchanged)
exportBtn.addEventListener("click", async () => {
    if (conversationHistory.length === 0) {
        alert('No conversation history to export yet.');
        return;
    }
    
    const logText = conversationHistory.map(entry => 
        `[${entry.displayTime}] ${entry.sender === 'user' ? 'User' : 'Bot'}: ${entry.message}`
    ).join('\n\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RetailAI_Chat_Log_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// Clear history (unchanged)
clearBtn.addEventListener("click", () => {
    if (confirm('Clear all conversation history?')) {
        conversationHistory = [];
        localStorage.removeItem('conversationHistory');
        chatBox.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to the Retail Chat Assistant!</h3>
                <p>Ask me anything surrounding your data!</p>
            </div>
            <div class="message bot-message">
                Hello! How can I assist you today?
                <span class="message-timestamp">${getCurrentTime()}</span>
            </div>
        `;
    }
});

// Load previous conversations on page load
window.addEventListener('DOMContentLoaded', () => {
    if (conversationHistory.length > 0) {
        document.querySelectorAll('.welcome-message, .bot-message').forEach(el => el.remove());
        conversationHistory.forEach(entry => {
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message", entry.sender === "user" ? "user-message" : "bot-message");
            messageDiv.innerHTML = `
                ${entry.message.replace(/\n/g, "<br>")}
                <span class="message-timestamp">${entry.displayTime}</span>
            `;
            chatBox.appendChild(messageDiv);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});