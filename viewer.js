document.addEventListener("DOMContentLoaded", () => {
    const noteContent = document.getElementById("note-content");
    const renderedContent = document.getElementById("rendered-content");
    const fileInput = document.getElementById("file-input");
    const saveButton = document.getElementById("save-content");
    const undoButton = document.getElementById("undo-content");
    const toggleViewButton = document.getElementById("toggle-view");

    let isRenderedMode = false;
    let tempContent = ""; // Stores new uploaded content temporarily

    // Load saved content and mode
    chrome.storage.local.get(["noteContent", "isRenderedMode"], (data) => {
        isRenderedMode = data.isRenderedMode || false;
        updateContentView(data.noteContent || "Write your note here or Upload", isRenderedMode);
    });

    // Save content and render mode
    saveButton.addEventListener("click", () => {
        const content = isRenderedMode ?
            renderedContent.contentDocument.body.innerHTML :
            noteContent.value;

        chrome.storage.local.set({ 
            noteContent: content, 
            isRenderedMode: isRenderedMode 
        }, () => {
            chrome.runtime.sendMessage({ action: "updateStickyNote" });
            alert("Content saved!");
        });
    });

    // Undo: Restore last saved content
    undoButton.addEventListener("click", () => {
        chrome.storage.local.get("noteContent", (data) => {
            updateContentView(data.noteContent || "", isRenderedMode);
        });
    });

    // Toggle between Text and Rendered Mode
    toggleViewButton.addEventListener("click", () => {
        isRenderedMode = !isRenderedMode;
        chrome.storage.local.set({ isRenderedMode });
        updateContentView(tempContent || noteContent.value, isRenderedMode);
        chrome.runtime.sendMessage({ action: "updateStickyNote" });
    });

    // Handle file uploads
    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            tempContent = e.target.result;
            updateContentView(tempContent, isRenderedMode);
        };
        reader.readAsText(file);
    });

    // Function to update content display
    function updateContentView(content, isHTML) {
        if (isHTML) {
            let doc = renderedContent.contentDocument || renderedContent.contentWindow.document;
            doc.open();
            doc.write(content);
            doc.close()
            if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
                alert("⚠️ Warning: This HTML file contains scripts, which cannot run due to Chrome Extension security policies. The content will display but may not work fully.");
            }

            renderedContent.style.display = "block";
            noteContent.style.display = "none";
            toggleViewButton.textContent = "Switch to Text Mode";
        } else {
            noteContent.value = content;
            noteContent.style.display = "block";
            renderedContent.style.display = "none";
            toggleViewButton.textContent = "Switch to Rendered Mode";
        }
    }
});
