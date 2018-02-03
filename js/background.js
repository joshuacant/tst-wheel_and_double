"use strict";
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
let disableScrolling = false;
let scrollingInverted = false;
let skipCollapsed = true;
let skipCycling = false;
let doubleClickEnabled = true;
let doubleClickSpeed = '250';
let previousClickTime = 0;
let previousTabId = null;

window.addEventListener('DOMContentLoaded', async () => {

    await registerToTST();

    const initalizingOptions = browser.storage.local.get();

    initalizingOptions.then(loadOptions);
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
        const success = await browser.runtime.sendMessage(kTST_ID, {
            type: 'register-self',
            name: self.id,
        });
        if (success) {
            disableScroll();
        }
        return Promise.resolve(true);
    }
    catch (ex) {
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
        doubleClickEnabled = options.doubleClickEnabled;
        doubleClickSpeed = options.doubleClickSpeed;
    }
}

function reloadOptions(options) {
    disableScrolling = options.disableScrolling.newValue;
    scrollingInverted = options.scrollingInverted.newValue;
    skipCollapsed = options.skipCollapsed.newValue;
    skipCycling = options.skipCycling.newValue;
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

function reloadTab(tabId) {
    browser.tabs.reload(tabId);
}

function findNonCollapsedTab(tabs, direction, currentIndex) {
    let currentTab = tabs[currentIndex];
    do {
        currentIndex = direction + currentIndex;
        if (currentIndex === -1) {
            if (skipCycling) {
                return tabs[0];
            }
            currentIndex = tabs.length - 1
        }
        else if (currentIndex === tabs.length) {
            if (skipCycling) {
                return tabs[tabs.length - 1]
            }
            currentIndex = 0;
        }
        currentTab = tabs[currentIndex]
    } while (currentTab.states.includes('collapsed'));
    return currentTab.id;
}

function handleScroll(aMessage) {
    console.log("scrolled %s", aMessage.deltaY > 0 ? "down" : "up");
    let activeTabIndex = aMessage.tabs.findIndex(tab => tab.active);
    let direction = aMessage.deltaY > 0 ? 1 : -1;
    let id;
    if (skipCollapsed) {
        id = findNonCollapsedTab(aMessage.tabs, direction, activeTabIndex);
    } else {
        id = aMessage.tabs[activeTabIndex + direction].id
    }
    browser.tabs.update(id, {active: true});
    return Promise.resolve(true);
}

function handleTabClick(aMessage) {
    if (!doubleClickEnabled) {
        return Promise.resolve(false);
    }

    const now = Date.now();

    if (previousTabId === aMessage.tab.id && now - previousClickTime < doubleClickSpeed) {
        browser.tabs.reload(aMessage.tab.id);
        return reloadTab(aMessage.tab.id);
    }
    previousClickTime = now;
    previousTabId = aMessage.tab.id;
    return Promise.resolve(false);
}

