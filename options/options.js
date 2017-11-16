function loadOptions() {
  function setOptions(options) {
    //console.log(options);
    document.querySelector("#scrollingInverted").checked = options.scrollingInverted;
    document.querySelector("#skipCollapsed").checked = options.skipCollapsed;
    document.querySelector("#skipCycling").checked = options.skipCycling;
    document.querySelector("#doubleClickEnabled").checked = options.doubleClickEnabled;
    document.querySelector("#doubleClickSpeed").value = options.doubleClickSpeed;
  }
  var getting = browser.storage.local.get();
  getting.then(setOptions, onError);
}

function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    scrollingInverted: document.querySelector("#scrollingInverted").checked,
    skipCollapsed: document.querySelector("#skipCollapsed").checked,
    skipCycling: document.querySelector("#skipCycling").checked,
    doubleClickEnabled: document.querySelector("#doubleClickEnabled").checked,
    doubleClickSpeed: document.querySelector("#doubleClickSpeed").value
  });
  loadOptions();
}

function onError(error) {
  console.log(`Error: ${error}`);
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
