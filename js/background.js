"use strict";
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
let disableScrolling = false;
let scrollingInverted = false;
let skipCollapsed = true;
let skipCycling = false;
let enableScrollWindow = false;
let windowScrollSpeed = '25';
let doubleClickEnabled = true;
let doubleClickSpeed = '250';
let previousClickTime = 0;
let previousTabId = null;
let previousScrollTime = 0;
const scrollDelay = 100;

window.addEventListener('DOMContentLoaded', async () => {
    console.log("registering");
    await registerToTST();
    const initalizingOptions = await browser.storage.local.get();
    loadOptions(initalizingOptions);
    browser.storage.onChanged.addListener(reloadOptions);
    browser.runtime.onMessageExternal.addListener(onMessageExternal);
});

function onMessageExternal(aMessage, aSender) {
    if (aSender.id === kTST_ID) {
        switch (aMessage.type) {
            case ('scrolled'):
                return handleScroll(aMessage);
            case ('tab-clicked'):
                return handleTabClick(aMessage);
            case ('ready'):
                console.log("re-registering");
                return registerToTST();
            default:
                return Promise.resolve(false);
        }
    }
    return Promise.resolve(false);
}

async function registerToTST() {
    try {
        const self = await browser.management.getSelf();
        let success = await browser.runtime.sendMessage(kTST_ID, {
            type: 'register-self',
            name: self.id,
        });
        if (success) {
            console.log("registration successful");
            disableScroll();
        }
        return Promise.resolve(true);
    }
    catch (ex) {
        console.log("registration failed");
        console.log(ex);
    }
}

function loadOptions(options) {
    if (Object.keys(options).length === 0) {
        createOptions();
    }
    else {
        disableScrolling = options.disableScrolling;
        scrollingInverted = options.scrollingInverted;
        skipCollapsed = options.skipCollapsed;
        skipCycling = options.skipCycling;
        enableScrollWindow = options.enableScrollWindow;
        windowScrollSpeed = options.windowScrollSpeed;
        doubleClickEnabled = options.doubleClickEnabled;
        doubleClickSpeed = options.doubleClickSpeed;
    }
}

function reloadOptions(options) {
    disableScrolling = options.disableScrolling.newValue;
    scrollingInverted = options.scrollingInverted.newValue;
    skipCollapsed = options.skipCollapsed.newValue;
    skipCycling = options.skipCycling.newValue;
    enableScrollWindow = options.enableScrollWindow.newValue;
    windowScrollSpeed = options.windowScrollSpeed.newValue;
    doubleClickEnabled = options.doubleClickEnabled.newValue;
    doubleClickSpeed = options.doubleClickSpeed.newValue;

    if (disableScrolling) {
        enableScroll();
    } else {
        disableScroll();
    }
}

function createOptions() {
    browser.storage.local.set({
        disableScrolling: disableScrolling,
        scrollingInverted: scrollingInverted,
        skipCollapsed: skipCollapsed,
        skipCycling: skipCycling,
        enableScrollWindow: enableScrollWindow,
        windowScrollSpeed: windowScrollSpeed,
        doubleClickEnabled: doubleClickEnabled,
        doubleClickSpeed: doubleClickSpeed
    });
    const reloadingOptions = browser.storage.local.get();
    reloadingOptions.then(loadOptions);
}

function disableScroll() {
    browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll-lock'
    });
}

function enableScroll() {
    browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll-unlock'
    });
}

function handleScroll(aMessage) {
    // console.log(`scrolled ${aMessage.deltaY > 0 ? "down" : "up"}`);

    if (enableScrollWindow && aMessage.shiftKey) {
        return handleWindowScroll(aMessage)
    }

    let activeTabIndex = aMessage.tabs.findIndex(tab => tab.active);
    let direction = aMessage.deltaY > 0 ? 1 : -1;
    direction = scrollingInverted ? -direction : direction;
    let id;

    if (skipCollapsed) {
        id = findNonCollapsedTab(aMessage.tabs, direction, activeTabIndex);
    } else {
        id = findAnyNextTab(activeTabIndex, direction, aMessage.tabs);
    }
    browser.tabs.update(id, {active: true});
    return Promise.resolve(true);
}


function handleWindowScroll(aMessage) {
    let now = Date.now();
    // ensures scroll isn't snapping back and forth
    if (now - previousScrollTime < scrollDelay) {
        return Promise.resolve(true);
    }

    previousScrollTime = now;
    let window = aMessage.window;
    let delta = aMessage.deltaY;
    browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll',
        window: window,
        delta: delta * windowScrollSpeed
    });
    return Promise.resolve(true);
}

function findNonCollapsedTab(tabs, direction, currentIndex) {
    let currentTab = tabs[currentIndex];
    do {
        currentIndex = direction + currentIndex;
        if (currentIndex === -1) {
            if (skipCycling) {
                return tabs[0].id;
            }
            currentIndex = tabs.length - 1
        }
        else if (currentIndex === tabs.length) {
            if (skipCycling) {
                return tabs[tabs.length - 1].id
            }
            currentIndex = 0;
        }
        currentTab = tabs[currentIndex]
    } while (currentTab.states.includes('collapsed'));
    return currentTab.id;
}

function findAnyNextTab(activeTabIndex, direction, tabs) {
    let id;
    if (activeTabIndex + direction < 0) {
        id = skipCycling ? tabs[0].id : tabs[tabs.length - 1].id
    }
    else if (activeTabIndex + direction === tabs.length) {
        id = skipCycling ? tabs[tabs.length - 1].id : tabs[0].id;
    }
    else {
        id = tabs[activeTabIndex + direction].id
    }
    return id;
}

function handleTabClick(aMessage) {
    if (!doubleClickEnabled) {
        return Promise.resolve(false);
    }

    const now = Date.now();
    if (previousTabId === aMessage.tab.id && now - previousClickTime < doubleClickSpeed) {
        browser.tabs.reload(aMessage.tab.id);
        return Promise.resolve(true);
    }
    previousClickTime = now;
    previousTabId = aMessage.tab.id;
    return Promise.resolve(false);
}
