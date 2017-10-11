const kTST_ID = 'treestyletab@piro.sakura.ne.jp';
const ext_ID = 'tst-wheel_and_double@dontpokebadgers.com'
var scrollingInverted = null;
var doubleClickEnabled = null;
var doubleClickSpeed = null;
var previousClickTime = 0;
var previousTabId = null;

function initialRegisterToTST() {
  setTimeout(registerToTST, 3000);
}

async function registerToTST() {
  var success = await browser.runtime.sendMessage(kTST_ID, {
    type: 'register-self',
    name: ext_ID,
    //style: '.tab {color: green;}'
  })
//  if (!success) {
//    console.log(ext_ID+" unable to register.");
//    }
//  else {
//    console.log(ext_ID+" registered sucessfully.");
//  }
}

async function loadOptions(options) {
  if (Object.keys(options).length == 0) {
    //console.log("no options");
    createOptions();
  }
  else {
    scrollingInverted = options.scrollingInverted;
    doubleClickEnabled = options.doubleClickEnabled;
    doubleClickSpeed = options.doubleClickSpeed;
    //console.log(options);
  }
}

async function createOptions() {
  browser.storage.local.set({
    scrollingInverted: false,
    doubleClickEnabled: true,
    doubleClickSpeed: "250"
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

initialRegisterToTST();
disableScroll();
var initalizingOptions = browser.storage.local.get();
initalizingOptions.then(loadOptions);
browser.runtime.onMessageExternal.addListener((aMessage, aSender) => {
  var refreshingOptions = browser.storage.local.get();
  refreshingOptions.then(loadOptions);
  switch (aSender.id) {
    case kTST_ID:
      //console.log(aMessage.type)
      switch (aMessage.type) {
        case 'ready':
          //console.log("re-registering");
          registerToTST();
          disableScroll();
          break;
        case 'tab-clicked':
          //console.log(doubleClickEnabled);
          if (doubleClickEnabled == false) { break; }
          var d = new Date();
          currentClickTime = d.getTime();
          clickDelta = currentClickTime - previousClickTime;
          if (clickDelta < doubleClickSpeed && previousTabId == aMessage.tab.id) {
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
            //for (var iState = 0; iState < aMessage.tabs[iTab].states.length; ++iState) {
              //if (aMessage.tabs[iTab].states[iState]  == 'active') {
                //activeTabPosition = iTab;
                //break;
              //}
            //}
            if (activeTabPosition == iTab) { break; }
          }
          //console.log(activeTabPosition);
          var tabDelta = null;
          var mouseDelta = aMessage.deltaY;
          //console.log(scrollingInverted);
          if (scrollingInverted) { mouseDelta = mouseDelta * -1; }
          
          if (mouseDelta > 0) {
            //console.log('down');
            tabDelta = 1;
            if (activeTabPosition == aMessage.tabs.length-1) {
              browser.tabs.update(aMessage.tabs[0].id, { active: true });
              //console.log('MOVING: back to the start');
            }
            else {
              //console.log(activeTabPosition+tabDelta);
              browser.tabs.update(aMessage.tabs[(activeTabPosition+tabDelta)].id, { active: true })
              //console.log('MOVING: next one down');
            }
          }
          if (mouseDelta < 0) {
            //console.log('up');
            tabDelta = -1;
            if (activeTabPosition == 0) {
              browser.tabs.update(aMessage.tabs[aMessage.tabs.length-1].id, { active: true });
              //console.log('MOVING: to the end');
            }
            else {
              //console.log(activeTabPosition+tabDelta);
              browser.tabs.update(aMessage.tabs[(activeTabPosition+tabDelta)].id, { active: true })
              //console.log('MOVING: next one up');
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
