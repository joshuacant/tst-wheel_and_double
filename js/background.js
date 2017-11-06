"use strict";
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
const ext_ID = 'tst-wheel_and_double@dontpokebadgers.com'
var scrollingInverted = false;
var skipCollapsed = true;
var doubleClickEnabled = true;
var doubleClickSpeed = '250';
var previousClickTime = 0;
var previousTabId = null;

//function initialRegisterToTST() {
//  setTimeout(registerToTST, 100);
//}

async function registerToTST() {
  var success = await browser.runtime.sendMessage(kTST_ID, {
    type: 'register-self',
    name: ext_ID,
    //style: '.tab {color: green;}'
  })
  if (success) {
    await disableScroll();
  }
}

async function loadOptions(options) {
  if (Object.keys(options).length == 0) {
    //console.log("no options");
    createOptions();
  }
  else {
    scrollingInverted = options.scrollingInverted;
    skipCollapsed = options.skipCollapsed;
    doubleClickEnabled = options.doubleClickEnabled;
    doubleClickSpeed = options.doubleClickSpeed;
    //console.log(options);
  }
}

async function reloadOptions(options) {
  scrollingInverted = options.scrollingInverted.newValue;
  skipCollapsed = options.skipCollapsed.newValue;
  doubleClickEnabled = options.doubleClickEnabled.newValue;
  doubleClickSpeed = options.doubleClickSpeed.newValue;
  //console.log(options);
}

async function createOptions() {
  browser.storage.local.set({
    scrollingInverted: scrollingInverted,
    skipCollapsed: skipCollapsed,
    doubleClickEnabled: doubleClickEnabled,
    doubleClickSpeed: doubleClickSpeed
  });
  //console.log("creating default options");
  var reloadingOptions = browser.storage.local.get();
  reloadingOptions.then(loadOptions);
}

async function disableScroll() {
  var success = await browser.runtime.sendMessage(kTST_ID, {
    type: 'scroll-lock'
  });
  //console.log(success);
}

async function reloadTab(tabId) {
  await browser.tabs.reload(tabId);
}

//initialRegisterToTST();
registerToTST();
var initalizingOptions = browser.storage.local.get();
initalizingOptions.then(loadOptions);
browser.storage.onChanged.addListener(reloadOptions);
browser.runtime.onMessageExternal.addListener((aMessage, aSender) => {
  switch (aSender.id) {
    case kTST_ID:
      //console.log(aMessage.type)
      switch (aMessage.type) {
        case 'ready':
          //console.log("re-registering");
          registerToTST();
          break;
        case 'tab-clicked':
          //console.log(doubleClickEnabled);
          if (doubleClickEnabled == false) { break; }
          var d = new Date();
          var currentClickTime = d.getTime();
          var clickDelta = currentClickTime - previousClickTime;
          if (clickDelta < parseInt(doubleClickSpeed) && previousTabId == aMessage.tab.id && aMessage.button == 0) {
            //console.log('double click on tab');
            reloadTab(aMessage.tab.id);
          }
          previousClickTime = currentClickTime;
          previousTabId = aMessage.tab.id;
          break;
        case 'scrolled':
          //console.log(aMessage.tabs)
          var activeTabPosition = null;
          for (var iTab = 0; iTab < aMessage.tabs.length; ++iTab) {
            if (aMessage.tabs[iTab].active == true) { activeTabPosition = iTab; }
            if (activeTabPosition == iTab) { break; }
          }
          //console.log(activeTabPosition);
          var tabDelta = null;
          var validTabFound = true;
          var mouseDelta = aMessage.deltaY;
          //console.log(scrollingInverted);
          if (scrollingInverted) { mouseDelta = mouseDelta * -1; }
          if (skipCollapsed) {var validTabFound = false;}
          if (mouseDelta > 0) {
            //console.log('down');
            tabDelta = 1;
            if (activeTabPosition == aMessage.tabs.length-1) {
              browser.tabs.update(aMessage.tabs[0].id, { active: true });
              //console.log('MOVING: start');
            }
            else {
              //console.log(activeTabPosition+tabDelta);
              while (validTabFound == false ) {
                if (activeTabPosition + tabDelta > aMessage.tabs.length-1) {
                  tabDelta = activeTabPosition * -1;
                  break;
                }
                if (aMessage.tabs[(activeTabPosition+tabDelta)].states.indexOf('collapsed') != -1) {
                  tabDelta++;
                }
                else { validTabFound = true; }
              }
              browser.tabs.update(aMessage.tabs[(activeTabPosition+tabDelta)].id, { active: true });
              //console.log('MOVING: down');
            }
          }
          if (mouseDelta < 0) {
            //console.log('up');
            tabDelta = -1;
            if (activeTabPosition == 0) {
              while (validTabFound == false ) {
                if (aMessage.tabs[(aMessage.tabs.length+tabDelta)].states.indexOf('collapsed') != -1) {
                  tabDelta--;
                }
                else { validTabFound = true; }
              }
              browser.tabs.update(aMessage.tabs[aMessage.tabs.length+tabDelta].id, { active: true });
              //console.log('MOVING: end');
            }
            else {
              while (validTabFound == false ) {
                if (aMessage.tabs[(activeTabPosition+tabDelta)].states.indexOf('collapsed') != -1) {
                  tabDelta--;
                }
                else { validTabFound = true; }
              }
              browser.tabs.update(aMessage.tabs[(activeTabPosition+tabDelta)].id, { active: true });
              //console.log('MOVING: up');
            }
          }
          return Promise.resolve(true);
          break;
      }
      break;
  }
});

//var success = await browser.runtime.sendMessage(kTST_ID, {
//  type: 'scroll-unlock'
//});

//var success = await browser.runtime.sendMessage(kTST_ID, {
//  type: 'unregister-self'
//});
