chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "toggleNote") {
        toggleStickyNote();
        sendResponse({ isVisible: !!document.getElementById("sticky-note") });
    } else if (message.action === "updateStyle") {
        applyStyle(message.style);
    } else if (message.action === "toggleFixed") {
        toggleFixedPosition(message.isFixed);
    } else if (message.action === "resetPosition") {
        resetNotePosition();
    } else if (message.action === "updateStickyNote") {
        loadStickyNoteContent();
    } else if (message.action === "getNoteState") {
        let isVisible = !!document.getElementById("sticky-note");
        // console.log("Responding with note state:", isVisible);
        sendResponse({ isVisible });
    } else if (message.action === "testMessage") {
        // console.log("Test message received.");
        sendResponse({ success: true });
    }
});


function toggleStickyNote() {
    let note = document.getElementById("sticky-note");
    let isVisible = !!note;

    if (note) {
        note.remove();
        isVisible = false;
    } else {
        // console.log("Content.js: Creating sticky note...");
        createStickyNote();
        isVisible = true;
    }

    // Get the tab ID and update the icon
    chrome.runtime.sendMessage({ action: "updateIcon", isVisible });

    // Store the note state **per-tab**
    chrome.storage.session.set({ [`tab-${window.location.href}`]: isVisible });
}





function createStickyNote() {
    if (document.getElementById("sticky-note")) return;

    // console.log("Content.js: Creating new sticky note element...");
    const note = document.createElement("div");
    note.id = "sticky-note";
    note.contentEditable = "true";

    document.body.appendChild(note);

    chrome.storage.local.get(["noteContent", "isRenderedMode", "notePosition", "noteStyle", "isFixed", "noteWidth", "noteHeight"], (data) => {
        applyNoteStyles(note, data);
        updateNoteContent(data.noteContent || "Write your note here or upload in the content viewer..", data.isRenderedMode);
    });

    note.addEventListener("input", () => {
        chrome.storage.local.set({ noteContent: note.innerText });
    });

    enableNoteDragAndResize(note);
}

function applyNoteStyles(note, data) {
    note.style.cssText = `
        position: ${data.isFixed ? "fixed" : "absolute"};
        top: ${data.notePosition?.top || "50px"};
        left: ${data.notePosition?.left || "50px"};
        width: ${data.noteWidth || "200px"};
        height: ${data.noteHeight || "150px"};
        border: 0px;
        padding: 10px;
        cursor: move;
        z-index: 9999;
        resize: both;
        overflow: auto;
        white-space: pre-wrap;
        background: ${data.noteStyle?.bgColor || "yellow"};
        color: ${data.noteStyle?.textColor || "black"};
        font-family: ${data.noteStyle?.font || "Arial, sans-serif"};
        font-size: ${data.noteStyle?.textSize || "16px"}px;
    `;
    injectScrollbarStyles();
}
// A sneaky scrollbar
function injectScrollbarStyles() {
    let styleElement = document.getElementById("sticky-note-scrollbar-style");

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "sticky-note-scrollbar-style";
        document.head.appendChild(styleElement);
    }

    styleElement.innerHTML = `
        #sticky-note::-webkit-scrollbar {
            width: 4px;
        }
        #sticky-note::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }
        #sticky-note::-webkit-scrollbar-track {
            background: transparent;
        }
    `;
}

// Sticky Note Displays Based on Render Mode
function updateNoteContent(newContent, isHTML) {
    let note = document.getElementById("sticky-note");

    if (note) {
        if (isHTML) {
            let iframe = document.createElement("iframe");
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";

            note.innerHTML = ""; // Clear previous content
            note.appendChild(iframe);

            let doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(newContent);
            doc.close();
        } else {
            note.innerText = newContent;
        }
    }
}

// Load Saved Content Based on Render Mode
function loadStickyNoteContent() {
    chrome.storage.local.get(["noteContent", "isRenderedMode"], (data) => {
        updateNoteContent(data.noteContent || "", data.isRenderedMode);
    });
}

// Enable Dragging and Resizing
function enableNoteDragAndResize(note) {
    let isDragging = false, isResizing = false, offsetX, offsetY, startWidth, startHeight;

    note.addEventListener("mousedown", (e) => {
        const rect = note.getBoundingClientRect();
        const resizeThreshold = 10;
        const isBottomRightCorner = (
            e.clientX > rect.right - resizeThreshold &&
            e.clientY > rect.bottom - resizeThreshold
        );

        if (isBottomRightCorner) {
            isResizing = true;
            startWidth = rect.width;
            startHeight = rect.height;
            offsetX = e.clientX;
            offsetY = e.clientY;
            note.style.cursor = "nwse-resize";
        } else {
            isDragging = true;
            offsetX = e.clientX - note.offsetLeft;
            offsetY = e.clientY - note.offsetTop;
            note.style.cursor = "grabbing";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            note.style.left = `${e.clientX - offsetX}px`;
            note.style.top = `${e.clientY - offsetY}px`;
        }

        if (isResizing) {
            note.style.width = `${startWidth + (e.clientX - offsetX)}px`;
            note.style.height = `${startHeight + (e.clientY - offsetY)}px`;
        }
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            chrome.storage.local.set({
                notePosition: { top: note.style.top, left: note.style.left }
            });
        }

        isDragging = false;
        isResizing = false;
        note.style.cursor = "move";

        new ResizeObserver(() => {
            chrome.storage.local.set({
                noteWidth: note.style.width,
                noteHeight: note.style.height
            });
        }).observe(note);
    });
}

// Apply Styles
function applyStyle(style) {
    let note = document.getElementById("sticky-note");
    if (note) {
        note.style.background = style.bgColor;
        note.style.color = style.textColor;
        note.style.fontSize = `${style.textSize}px`;
        note.style.fontFamily = style.font;

        chrome.storage.local.set({ noteStyle: style });
    }
}

// Toggle Fixed Position
function toggleFixedPosition(isFixed) {
    let note = document.getElementById("sticky-note");
    if (note) {
        note.style.position = isFixed ? "fixed" : "absolute";
        chrome.storage.local.set({ isFixed });
    }
}

// Reset Position
function resetNotePosition() {
    let note = document.getElementById("sticky-note");
    if (note) {
        note.style.top = "50px";
        note.style.left = "50px";
        chrome.storage.local.set({ notePosition: { top: "50px", left: "50px" } });
    }
}

// Load stored note content and styles on page load
chrome.storage.local.get(["noteContent", "isRenderedMode", "noteStyle", "noteWidth", "noteHeight"], (data) => {
    updateNoteContent(data.noteContent || "", data.isRenderedMode);
    applyStyle(data.noteStyle || {});
});
