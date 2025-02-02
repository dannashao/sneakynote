// Clear session storage on install/reload
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.session.clear();
});

chrome.runtime.onMessage.addListener((message, sender) => {
    // console.log("Background.js: Received message", message);

    if (message.action === "updateIcon" && sender.tab) {
        let tabId = sender.tab.id;
        let isVisible = message.isVisible;
        let iconPath = isVisible ? "icons/note-on.png" : "icons/note-off.png";

        // console.log("Background.js: Updating icon for tab", tabId, "to", iconPath);
        chrome.action.setIcon({ path: iconPath, tabId: tabId });

        chrome.storage.session.set({ [`tab-${tabId}`]: isVisible });
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.storage.session.get(`tab-${activeInfo.tabId}`, (data) => {
        let isVisible = data[`tab-${activeInfo.tabId}`] || false;
        let iconPath = isVisible ? "icons/note-on.png" : "icons/note-off.png";

        // console.log("Background.js: Tab switched. Setting icon for tab", activeInfo.tabId, "to", iconPath);
        chrome.action.setIcon({ path: iconPath, tabId: activeInfo.tabId });
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
        chrome.storage.session.get(`tab-${tabId}`, (data) => {
            let isVisible = data[`tab-${tabId}`] || false;
            let iconPath = isVisible ? "icons/note-on.png" : "icons/note-off.png";

            // console.log("Background.js: Tab refreshed. Setting icon for tab", tabId, "to", iconPath);
            chrome.action.setIcon({ path: iconPath, tabId: tabId });
        });
    }
});
