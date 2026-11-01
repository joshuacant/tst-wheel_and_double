async function _init() {
    document.addEventListener("DOMContentLoaded", loadOptions);
    document.querySelector("form").addEventListener("submit", saveOptions);
}

async function saveOptions(e) {
    const self = await browser.management.getSelf();
    e.preventDefault();
    
    let new_windowScrollMult = '1';
    let new_doubleClickSpeed = '250';
    function isNumeric(str) {
        if (typeof str != "string") return false
        return !isNaN(str) && !isNaN(parseFloat(str))
    }
    if (isNumeric(document.querySelector("#windowScrollMult").value)) {
        new_windowScrollMult = document.querySelector("#windowScrollMult").value
    }
    if (isNumeric(document.querySelector("#doubleClickSpeed").value)) {
        new_doubleClickSpeed = document.querySelector("#doubleClickSpeed").value
    }
    browser.storage.local.set({
        disableScrolling: document.querySelector("#disableScrolling").checked,
        scrollingInverted: document.querySelector("#scrollingInverted").checked,
        skipCollapsed: document.querySelector("#skipCollapsed").checked,
        skipDiscarded: document.querySelector("#skipDiscarded").checked,
        skipCycling: document.querySelector("#skipCycling").checked,
        skipGroups: document.querySelector("#skipGroups").checked,
        enableScrollWindow: document.querySelector("#enableScrollWindow").checked,
        windowScrollMult: new_windowScrollMult,
        doubleClickEnabled: document.querySelector("#doubleClickEnabled").checked,
        doubleClickSpeed: new_doubleClickSpeed
    });

    console.log(self.id + " options saved");
}

async function loadOptions() {
    const self = await browser.management.getSelf();
    function setOptions(options) {
        document.querySelector("#disableScrolling").checked = options.disableScrolling;
        document.querySelector("#scrollingInverted").checked = options.scrollingInverted;
        document.querySelector("#skipCollapsed").checked = options.skipCollapsed;
        document.querySelector("#skipDiscarded").checked = options.skipDiscarded;
        document.querySelector("#skipCycling").checked = options.skipCycling;
        document.querySelector("#skipGroups").checked = options.skipGroups;
        document.querySelector("#enableScrollWindow").checked = options.enableScrollWindow;
        document.querySelector("#windowScrollMult").value = options.windowScrollMult;
        document.querySelector("#doubleClickEnabled").checked = options.doubleClickEnabled;
        document.querySelector("#doubleClickSpeed").value = options.doubleClickSpeed;
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }
    
    const getting = browser.storage.local.get();
    getting.then(setOptions, onError);

    console.log(self.id + " options loaded");
}


_init()
