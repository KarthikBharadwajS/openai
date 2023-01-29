/** 
 * @description OPEN API KEY, as a best practice I would not recommend it to be in client application like below
 * @type {string}
 */
const OPENAI_API_KEY = "";

/**
 * Response state managers
 * @type {boolean}
 */
let bResponse = false;

/**
 * Response state managers for timer
 * @description the value will be initialized with empty string, when the value is not empty, it represents a timer is running
 * @type { timer | string}
 */
let bResponseTimer = "";

/** Handle multiple click events */
let sendButtonEnabled = true;

/**
 * This function is called on HTML DOM <body> loaded
 */
function OnLoad() {
    console.log("HTML Dom loaded");
    resetHandler();
}

/**
 * @description On reset button pressed, this function will called
 * clears the textarea and resets the buttons to original state
 */
function resetHandler() {
    document.getElementById("images").innerHTML = "";
    txtMsg.value = "";
    sendButtonEnabled = true;
    document.getElementById("btnSend").disabled = false;
    document.getElementById("btnReset").disabled = true;
}

/**
 * @description function which is used to generate images for each bullet points, queries dall-e api
 * @param {string} bPoint represent bullet point
 * @param {string} divId represents which div, the image has to be pushed into
 */
function generateImages(bPoint, divId) {
    const imagesDiv = document.getElementById(divId);

    txtMsg.value = txtMsg.value + "\n" + "Generating images for: " + bPoint;
    fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            "prompt": bPoint,
            "n": 2,
            "size": "1024x1024"
        })
    }).then(response => response.json()).then(result => {
        console.log("images result :", result);

        result.data.map(item => {
            console.log("item :", item);
            const i = document.createElement("img");
            i.width = "500";
            i.height = "500";

            i.style.display = "inline-block";
            i.src = item.url;

            imagesDiv.appendChild(i);
        });
    }).catch(error => {
        console.log("Error while generation images :", error);
    })
}

/**
 * @description the initial point where topic of user is passed to chat-gpt completions api
 * @param {string} sQuestion represents the selected question
 */
function bulletPointsGen(sQuestion) {

    /** main div to append all childs */
    const mainImagesDiv = document.getElementById("images");

    /** This request queries the Davinci model to complete the text starting with a prompt */
    const sModel = selModel.value || "text-davinci-003"; // "text-davinci-003";

    /** 
     * @type {integer} is an optional paramater, defaults to 16 if not passed
     * The maximum number of tokens to generate in the completion. The token count of your prompt plus max_tokens cannot exceed 
     * the model's context length. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
     */
    const iMaxTokens = 2048;

    /**
     * @type {integer} is an optional parameter, default to 1
     * Higher values means the model will take more risks. Try 0.9 for more creative applications, 
     * and 0 (argmax sampling) for ones with a well-defined answer.
     */
    const dTemperature = 0.5;

    const data = {
        model: sModel,
        prompt: "generate upto 5 points on " + sQuestion,
        max_tokens: iMaxTokens,
        temperature: dTemperature,

        /**
         * @type {integer} is an optional parameter, defaults to 0
         * Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, 
         * decreasing the model's likelihood to repeat the same line verbatim.
         * Ref: https://beta.openai.com/docs/api-reference/parameter-details
         */
        frequency_penalty: 0.0,

        /**
         * @type {integer} is an optional parameter, defaults to 0
         * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, 
         * increasing the model's likelihood to talk about new topics.
         * Ref: https://beta.openai.com/docs/api-reference/parameter-details
         */
        presence_penalty: 0.0,

        /**
         * @type {Array<string>} is an optional parameter, defaults to null
         * Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.
         */
        stop: ["#", ";"]
    }

    fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            console.log("Completions api response :", result);

            // Set response recieved true for state management
            bResponse = true;

            // If loader is still running, clear the loaders
            if (bResponseTimer === "") { bResponseTimer.clearTimeout(); };

            // Log the success status
            txtMsg.value = "Successfully fetched, generating and rendering results...";
            const arr = bulletPointsToArray(result.choices[0].text);
            console.log("Arr :", arr);

            // make a request to generate images
            arr.forEach((val, index) => {
                // create separate divs for each bullet point
                const divDoc = document.createElement("div");
                // setup div id with indexes
                const divId = `id_${index}`;
                divDoc.id = divId;
                divDoc.classList.add(divId);
                divDoc.style.border = "20px solid #969696"; // some styling

                /** another element to show the topic name */
                const generatePElem = document.createElement("h1");
                generatePElem.innerText = val;
                generatePElem.style.padding = "5";
                divDoc.appendChild(generatePElem);

                const regenDoc = document.createElement("div");
                regenDoc.style.padding = "20";

                const generateLabelElem = document.createElement("p");
                generateLabelElem.innerText = "Regenerate Image using below input with more context";
                generateLabelElem.style.padding = "5";
                divDoc.appendChild(generateLabelElem);

                const regenerateWithContextButton = document.createElement("button");
                regenerateWithContextButton.style.diplay = "inline-block";
                regenerateWithContextButton.id = divId + "_button";
                regenerateWithContextButton.innerText = "Regenerate";

                const regenerateWithContextInput = document.createElement("input");
                regenerateWithContextInput.type = "text";
                regenerateWithContextInput.style.diplay = "inline-block";
                regenerateWithContextInput.id = divId + "_input";
                regenDoc.appendChild(regenerateWithContextInput); regenDoc.appendChild(regenerateWithContextButton);
                divDoc.appendChild(regenDoc);

                mainImagesDiv.appendChild(divDoc);

                registerEvent(divId + "_button");

                // Call the generate images dall-e api 
                generateImages(val, divId);

                if (index >= arr.length - 1) {
                    setTimeout(function () {
                        sendButtonEnabled = false;
                        document.getElementById("btnReset").disabled = false;
                        txtMsg.value = txtMsg.value + "\n" + "Image rendering might be slow depending on connection speed ...";
                        txtMsg.value = txtMsg.value + "\n" + "Click on the reset button, to try with different topic.";

                    }, 5000);
                }
            })
        })
        .catch(error => {
            console.log("Error during completions api :", error);
            sendButtonEnabled = false;
            document.getElementById("btnReset").disabled = false;
            txtMsg.value = txtMsg.value + "\n" + "There was some problem with the current topic, try again with different topic";
            txtMsg.value = txtMsg.value + "\n" + "Click on the reset button, to try with different topic.";
        })
};

function registerEvent(id) {
    document.getElementById(id).addEventListener("click", eventHandler);
}

function eventHandler(event) {
    const el = event.srcElement;
    const id = el.id.replace("_button", "");

    const value = document.getElementById(id + "_input").value;
    console.log("Regen value :", value);


    document.querySelectorAll(`.${id} img`)
        .forEach(img => img.remove());
    
    generateImages(value, id);
}

/**
 * Reset handler for the button
 */
function Reset() {
    window.location.reload();
}

/**
 * Send button handler
 * @returns void
 */
function Send() {

    // request the api if button is enabled
    if (sendButtonEnabled) {
        sendButtonEnabled = false;
        document.getElementById("btnSend").disabled = true;
        document.getElementById("btnReset").disabled = true;

        // take the txtMsg value
        var sQuestion = txtMsg.value;

        // If no topic or question is posted, validate it 
        if (sQuestion == "") {
            alert("Type in your question!");
            txtMsg.focus();
            return;
        }

        // Set response as false initially
        bResponse = false;

        // Call the API
        bulletPointsGen(sQuestion);

        // Call the loaders for the user experience factor
        loader("Fetching results from chat gpt", txtMsg);
    }
}

/**
 * loader
 * @param {string} originalMessage 
 * @param {DOM Elem} doc 
 */
function loader(originalMessage, doc) {
    // Manage loader until the response is recieved
    if (!bResponse) {
        let dots = originalMessage.split(".");
        if (dots.length > 4) {
            dots = 1;
        }

        let updatedMessage = originalMessage.split(".")[0];
        for (i = 0; i < dots.length; i++) {
            updatedMessage = updatedMessage + "."
        }
        timer(updatedMessage, doc);
    }
}

/**
 * Timer for dotted ux
 * @param {string} message 
 * @param {DOM Elem} doc 
 */
function timer(message, doc) {
    // dotted UX handler
    bResponseTimer = setTimeout(function () {
        if (!bResponse) {
            doc.value = message;
            loader(message, doc);
        }
    }, 500);
}

/**
 * ChatGPT completion api response will be in a single text field, so need to split it into an array
 * @param {string} text 
 * @returns {Array<string>}
 */
function bulletPointsToArray(text) {
    // Split the text into lines
    let lines = text.split("\n");
    let output = [];
    // Iterate through each line
    for (let i = 0; i < lines.length; i++) {
        // If the line starts with a bullet point with ., add it to the output array
        if (lines[i].startsWith(".")) {
            output.push(lines[i].substring(1).trim());
        }

        // If the line starts with a bullet point with -, add it to the output array
        if (lines[i].startsWith("-")) {
            output.push(lines[i].substring(1).trim());
        }

        // If the line starts with a bullet point with number, add it to the output array
        if (lines[i].match(/^\d+\./)) {
            output.push(lines[i].substring(lines[i].indexOf(".") + 1).trim());
        }

    }
    return output;
}