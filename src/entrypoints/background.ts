export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') });
  });
});
