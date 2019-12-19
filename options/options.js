function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        disableScrolling: document.querySelector("#disableScrolling").checked,
        scrollingInverted: document.querySelector("#scrollingInverted").checked,
        skipCollapsed: document.querySelector("#skipCollapsed").checked,
        skipDiscarded: document.querySelector("#skipDiscarded").checked,
        skipCycling: document.querySelector("#skipCycling").checked,
        enableScrollWindow: document.querySelector("#enableScrollWindow").checked,
        windowScrollSpeed: document.querySelector("#windowScrollSpeed").value,
        doubleClickEnabled: document.querySelector("#doubleClickEnabled").checked,
        doubleClickSpeed: document.querySelector("#doubleClickSpeed").value
    });
}

function loadOptions() {
    function setOptions(options) {
        document.querySelector("#disableScrolling").checked = options.disableScrolling;
        document.querySelector("#scrollingInverted").checked = options.scrollingInverted;
        document.querySelector("#skipCollapsed").checked = options.skipCollapsed;
        document.querySelector("#skipDiscarded").checked = options.skipDiscarded;
        document.querySelector("#skipCycling").checked = options.skipCycling;
        document.querySelector("#enableScrollWindow").checked = options.enableScrollWindow || false;
        document.querySelector("#windowScrollSpeed").value = options.windowScrollSpeed || "25";
        document.querySelector("#doubleClickEnabled").checked = options.doubleClickEnabled;
        document.querySelector("#doubleClickSpeed").value = options.doubleClickSpeed;
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }
    
    const getting = browser.storage.local.get();
    getting.then(setOptions, onError);
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
