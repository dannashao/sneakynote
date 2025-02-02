document.addEventListener("DOMContentLoaded", () => {
    // console.log("Popup loaded!");

    const toggleBtn = document.getElementById("toggle-note");
    const noteStatus = document.getElementById("note-status");
    const bgColorInput = document.getElementById("bg-color");
    const textColorInput = document.getElementById("text-color");
    const textSizeInput = document.getElementById("text-size");
    const fontInput = document.getElementById("font-input");
    const fixPositionCheckbox = document.getElementById("fix-position");
    const resetPositionBtn = document.getElementById("reset-position");
    const viewContentBtn = document.getElementById("view-content");


    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error("Error querying tabs:", chrome.runtime.lastError);
            return;
        }

        if (!tabs || tabs.length === 0) {
            console.error("No active tab found.");
            return;
        }

        const tabId = tabs[0].id;
        console.log("Active Tab ID:", tabId);

        // Request current note state from content.js
        chrome.tabs.sendMessage(tabId, { action: "getNoteState" }, (response) => {
            // console.log("Received response from content script:", response);
            if (response) {
                let isVisible = response.isVisible;
                updateNoteStatus(isVisible);
            } else {
                console.error("No response received from content script.");
            }
        });
    });

    toggleBtn.addEventListener("click", () => {
       // console.log("Toggle button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error("No active tab found.");
                return;
            }

            let tabId = tabs[0].id;
            // console.log("Sending toggle request to content script for tab:", tabId);

            chrome.tabs.sendMessage(tabId, { action: "toggleNote" });

            // Request the updated state
            chrome.tabs.sendMessage(tabId, { action: "getNoteState" }, (response) => {
                // console.log("Received updated response:", response);
                if (response) {
                    let isVisible = response.isVisible;
                    chrome.runtime.sendMessage({ action: "updateIcon", isVisible, tabId });
                    updateNoteStatus(isVisible);
                } else {
                    console.error("No response after toggling note.");
                }
            });
        });
    });

    function updateNoteStatus(isVisible) {
        noteStatus.textContent = isVisible ? "Sticky note is shown" : "Sticky note is off";
        // console.log("Updated note status:", noteStatus.textContent);
    }

    function updateExtensionIcon(isVisible) {
        chrome.action.setIcon({
            path: isVisible ? "icons/note-on-16.png" : "icons/note-off-16.png"
        });
    }

    // Change note styles
    function updateNoteStyle() {
        const style = {
            bgColor: bgColorInput.value,
            textColor: textColorInput.value,
            textSize: textSizeInput.value,
            font: fontInput.value.trim() || "Arial"
        };
        chrome.storage.local.set({ noteStyle: style });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "updateStyle", style });
        });
    }

    bgColorInput.addEventListener("input", updateNoteStyle);
    textColorInput.addEventListener("input", updateNoteStyle);
    textSizeInput.addEventListener("input", updateNoteStyle);
    fontInput.addEventListener("input", updateNoteStyle);

    // Toggle fixed/absolute position
    fixPositionCheckbox.addEventListener("change", () => {
        const isFixed = fixPositionCheckbox.checked;
        chrome.storage.local.set({ isFixed });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "toggleFixed", isFixed });
        });
    });

    // Reset Position
    resetPositionBtn.addEventListener("click", () => {
        chrome.storage.local.set({
            notePosition: { top: "50px", left: "50px" }
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "resetPosition" });
        });
    });

    // View Note Contents
    viewContentBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
    });
});
