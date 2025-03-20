// Select DOM elements
const chatBox = document.getElementById("chat-box");
const inputBox = document.getElementById("user-input");
const submitBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

// Function to append messages to the chat box
function appendMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    messageDiv.innerHTML = `
        ${message}
        <span class="message-timestamp">${getCurrentTime()}</span>
    `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Scrolling neatness
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
    if (!userQuestion) return; // Do nothing if the input is empty

    // Display user question
    appendMessage(userQuestion, "user");
    inputBox.value = ""; // Clear the input box

    // Show typing indicator & record the start time
    showTypingIndicator();
    const startTime = Date.now();
    const minTypingTime = 1000;  // minimum 1 second of typing

    // Call the API to get the answer
    try {
        const response = await fetch('https://mi138npanl.execute-api.us-east-2.amazonaws.com/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: userQuestion })
        });

        const data = await response.json();
        const botAnswer = data.result;

        // calculate elapsed time and await if needed to meet typing time
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minTypingTime ) {
            await new Promise(resolve => setTimeout(resolve, minTypingTime - elapsedTime));
        }

        // Hide typing indicator
        hideTypingIndicator();

        // Display bot's answer
        appendMessage(botAnswer, "bot");
    } catch (error) {
        // ensure minimum typing for errors
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minTypingTime ) {
            await new Promise(resolve => setTimeout(resolve, minTypingTime - elapsedTime));
        }

        hideTypingIndicator();
        appendMessage("Sorry, there was an error. Please try again.", "bot");
    }
});

// Optional: Allow "Enter" key to submit the message
inputBox.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        submitBtn.click();
    }
});

// Decoration: Show Typing Indicator
function showTypingIndicator() {
    typingIndicator.style.display = "block";
    setTimeout(() => {
    scrollToBottom();
    }, 10);
}

// Hide Typing Indicator
function hideTypingIndicator() {
    typingIndicator.style.display = "none";
}

// Scroll to Bottom
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

