// Select DOM elements
const chatBox = document.getElementById("chat-box");
const inputBox = document.getElementById("user-input");
const submitBtn = document.getElementById("send-btn");

// Function to append messages to the chat box
function appendMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    messageDiv.innerHTML = `
        ${message.replace(/\n/g, "<br>")} <!-- Replace newlines with <br> -->
        <span class="message-timestamp">${getCurrentTime()}</span>
    `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
}

// Function to get the current time
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
}

// Event listener for the submit button
submitBtn.addEventListener("click", async () => {
    const userQuestion = inputBox.value.trim();
    
    console.log("User Question:", userQuestion); // ✅ Debugging log

    if (!userQuestion) {
        console.warn("No input provided."); // Log warning if input is empty
        return; 
    }

    // Display user question
    appendMessage(userQuestion, "user");
    inputBox.value = ""; // Clear input field

    // Call the API to get the answer
    try {
        const requestBody = JSON.stringify({ "query": userQuestion });
        console.log("Sending API Request with payload:", requestBody); // ✅ Debug request payload

        const response = await fetch('https://cnszgaiw9k.execute-api.us-east-2.amazonaws.com/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody
        });

        console.log("API Response Status:", response.status); // ✅ Log status code

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // ✅ Log full API response

        // Check if the response contains graph data
        if (data.graphData) {
            renderGraph(data.graphData); // Call function to render graph
        } else {
            const botAnswer = data.data || "I'm sorry, I didn't understand that."; 
            appendMessage(botAnswer, "bot");
        }
    } catch (error) {
        console.error("Error fetching response:", error);
        appendMessage("Sorry, there was an error. Please try again.", "bot");
    }
});

// Allow "Enter" key to submit the message
inputBox.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        submitBtn.click();
    }
});

// Function to render the graph using Chart.js
function renderGraph(graphData) {
    if (!graphData || !graphData.labels || !graphData.values || graphData.labels.length === 0) {
      console.error("Invalid or empty graph data:", graphData);
      appendMessage("Sorry, no data was found to generate the graph.", "bot");
      return;
    }
  
    // Remove any existing graph
    const existingCanvas = document.getElementById("graphCanvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }
  
    // Create a new canvas element for the graph
    const canvas = document.createElement("canvas");
    canvas.id = "graphCanvas";
    chatBox.appendChild(canvas); // Append canvas to chat box
  
    const ctx = canvas.getContext("2d");
  
    new Chart(ctx, {
      type: graphData.type || "bar", // Default to bar chart if type is missing
      data: {
        labels: graphData.labels,
        datasets: [{
          label: graphData.title || "Data",
          data: graphData.values,
          backgroundColor: "rgba(54, 162, 235, 0.6)", // Blue color
          borderColor: "rgba(54, 162, 235, 1)",
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
}