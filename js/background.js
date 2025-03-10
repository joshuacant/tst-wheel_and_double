"use strict";
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
let disableScrolling = false;
let scrollingInverted = false;
let skipCollapsed = true;
let skipDiscarded = true;
let skipCycling = false;
let skipGroups = true;
let enableScrollWindow = false;
let windowScrollMult = '1';
let doubleClickEnabled = true;
let doubleClickSpeed = '250';
let previousClickTime = 0;
let previousTabId = null;
let previousScrollTime = 0;
let registrationStatus = false;
let scrollDelay = 100;

window.addEventListener('DOMContentLoaded', async () => {
    let initalizingOptions = await browser.storage.local.get();
    if (Object.keys(initalizingOptions).length === 0) {
        await createOptions();
        initalizingOptions = await browser.storage.local.get();
    }
    await loadOptions(initalizingOptions);
    let registrationTimeout = 0;
    while (registrationStatus === false && registrationTimeout < 10000) {
        console.log("registering tst-wheel_and_double");
        await timeout(registrationTimeout);
        await registerToTST();
        registrationTimeout = registrationTimeout + 1000;
    }
    browser.storage.onChanged.addListener(reloadOptions);
    browser.runtime.onMessageExternal.addListener(onMessageExternal);
});

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isNumeric(str) {
    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
}

let taskTail = null;

async function mutex(task) {
    // append myself to queue tail
    let prev = taskTail;
    let done;
    let cur = taskTail = new Promise((resolve) => done = resolve);
    // wait for previous task
    if (prev) {
        await prev;
    }
    // execute myself
    let result;
    let exception;
    try {
        result = await task();
    } catch (exc) {
        exception = exc;
    }
    // next task
    if (Object.is(cur, taskTail)) {
        // I am the last task, clear taskTail to avoid memory leak
        taskTail = null;
    } else {
        // signal for next task
        done();
    }
    // return
    if (exception) {
        throw exception;
    } else {
        return result;
    }
}

async function onMessageExternal(aMessage, aSender) {
    if (aSender.id !== kTST_ID) {
        return false;
    }

    try {
        await mutex(async () => {
            switch (aMessage.type) {
                case ('scrolled'):
                    return await handleScroll(aMessage);
                case ('tab-clicked'):
                    return await handleTabClick(aMessage);
                case ('ready'):
                    console.log("re-registering tst-wheel_and_double due to ready message");
                    return await registerToTST();
                case ('permissions-changed'):
                    console.log("re-registering tst-wheel_and_double due to permissions-changed message");
                    return await registerToTST();
                default:
                    return false;
            }
        });
    } catch (exc) {
        console.error('tst-wheel_and_double exception:', exc);
    }

    return false;
}

async function registerToTST() {
    try {
        const self = await browser.management.getSelf();
        let success = await browser.runtime.sendMessage(kTST_ID, {
            type: 'register-self',
            name: self.id,
            //permissions: ['tabs','activeTab'],
            listeningTypes: ['scrolled', 'tab-clicked', 'ready'],
        });
        if (disableScrolling === false) {
            lockTSTScrolling();
        }
        console.log("tst-wheel_and_double registration successful");
        registrationStatus = true;
        return true;
    }
    catch (ex) {
        console.log("tst-wheel_and_double registration failed with " + ex);
        return false;
    }
}

async function loadOptions(options) {
    disableScrolling = options.disableScrolling;
    scrollingInverted = options.scrollingInverted;
    skipCollapsed = options.skipCollapsed;
    skipDiscarded = options.skipDiscarded;
    skipCycling = options.skipCycling;
    skipGroups = options.skipGroups;
    enableScrollWindow = options.enableScrollWindow;
    windowScrollMult = options.windowScrollMult;
    doubleClickEnabled = options.doubleClickEnabled;
    doubleClickSpeed = options.doubleClickSpeed;
}

async function reloadOptions(options) {
    disableScrolling = options.disableScrolling.newValue;
    scrollingInverted = options.scrollingInverted.newValue;
    skipCollapsed = options.skipCollapsed.newValue;
    skipDiscarded = options.skipDiscarded.newValue;
    skipCycling = options.skipCycling.newValue;
    skipGroups = options.skipGroups.newValue;
    enableScrollWindow = options.enableScrollWindow.newValue;
    windowScrollMult = options.windowScrollMult.newValue;
    doubleClickEnabled = options.doubleClickEnabled.newValue;
    doubleClickSpeed = options.doubleClickSpeed.newValue;

    if (disableScrolling) {
        unlockTSTScrolling();
    } else {
        lockTSTScrolling();
    }
}

async function createOptions() {
    browser.storage.local.set({
        disableScrolling: disableScrolling,
        scrollingInverted: scrollingInverted,
        skipCollapsed: skipCollapsed,
        skipDiscarded: skipDiscarded,
        skipCycling: skipCycling,
        skipGroups: skipGroups,
        enableScrollWindow: enableScrollWindow,
        windowScrollMult: windowScrollMult,
        doubleClickEnabled: doubleClickEnabled,
        doubleClickSpeed: doubleClickSpeed
    });
}

async function lockTSTScrolling() {
    browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll-lock'
    });
}

async function unlockTSTScrolling() {
    browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll-unlock'
    });
}

async function handleScroll(aMessage) {
    if (enableScrollWindow && aMessage.shiftKey) {
        return await handleWindowScroll(aMessage)
    }

    let tstTabs = aMessage.tabs;
    // let activeTabIndex = tstTabs.findIndex(tab => tab.active);
    // NOTE: `tstTabs` could contain staled data since multiple wheel events can be emitted before `browser.tabs.update()`.
    // NOTE: So we use `browser.tabs.query()` to find out the current active tab.
    let activeTabs = await browser.tabs.query({
        windowId: aMessage.windowId || aMessage.window,
        active: true,
    });
    let activeTabIndex = tstTabs.findIndex(tab => tab.id == activeTabs[0].id);
    let direction = aMessage.deltaY > 0 ? 1 : -1;
    direction = scrollingInverted ? -direction : direction;
    let id = findNextTab(tstTabs, direction, activeTabIndex);

    await browser.tabs.update(id, { active: true });
    //console.log(`scrolled ${aMessage.deltaY > 0 ? "down" : "up"}`, activeTabs[0].id, ' => ', id);
    return true;
}

function findNextTab(tstTabs, direction, activeTabIndex) {
    let lastTabIndex = tstTabs.length;
    let nextTabIndex = activeTabIndex;
    let cycleCount = 0;
    do {
        nextTabIndex += direction;
        if (nextTabIndex < 0) {
            if (skipCycling) break;
            cycleCount++;
            nextTabIndex = lastTabIndex;
            continue;
        }
        if (nextTabIndex >= lastTabIndex) {
            if (skipCycling) break;
            cycleCount++;
            nextTabIndex = -1;
            continue;
        }
        if (skipCollapsed) if (tstTabs[nextTabIndex].states.includes('collapsed')) continue;
        if (skipDiscarded) if (tstTabs[nextTabIndex].discarded) continue;
        if (skipGroups) if (tstTabs[nextTabIndex].states.includes('group-tab')) continue;
        return tstTabs[nextTabIndex].id;
    } while (cycleCount < 2);
    return tstTabs[activeTabIndex].id;
}

async function handleWindowScroll(aMessage) {
    let now = Date.now();
    // ensures scroll isn't snapping back and forth
    if (now - previousScrollTime < scrollDelay) {
        return true;
    }
    previousScrollTime = now;

    let window = aMessage.window;
    let delta = aMessage.deltaY;
    delta = scrollingInverted ? -delta : delta;
    if (isNumeric(windowScrollMult) && windowScrollMult > 0.01) {
        delta = delta * windowScrollMult;
    }

    await browser.runtime.sendMessage(kTST_ID, {
        type: 'scroll',
        window: window,
        delta: delta
    });
    return true;
}

async function handleTabClick(aMessage) {
    if (!doubleClickEnabled) {
        return false;
    }

    const now = Date.now();
    if (previousTabId === aMessage.tab.id && now - previousClickTime < doubleClickSpeed) {
        await browser.tabs.reload(aMessage.tab.id);
        return true;
    }
    previousClickTime = now;
    previousTabId = aMessage.tab.id;
    return false;
}
