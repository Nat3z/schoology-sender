async function getCookies() {
  const cookies = await chrome.cookies.getAll({"domain": ".schoology.com"});
  return cookies
    .filter(cookie => cookie.name.startsWith('SESS'))
    .map(cookie => `${cookie.name}=${cookie.value}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'send-claim') {
    const { claimURL, claimPassword } = message.data;
    chrome.storage.sync.set({ claimURL, claimPassword });
    console.log('Claim URL and password sent to storage:', { claimURL, claimPassword });
    main().then((success) => {
      sendResponse({ success });
    });
  }
  else if (message.type === 'get-claim') {
    chrome.storage.sync.get(['claimURL', 'claimPassword']).then(({ claimURL, claimPassword }) => {
      console.log('Claim URL and password fetched from storage:', { claimURL, claimPassword });
      sendResponse({ claimURL, claimPassword });
    });
  }

  return true;
});

async function main() {
  try {
    const sessCookies = await getCookies();
    if (sessCookies.length === 0) {
      console.log('No SESS cookies found');
      return false;
    }
    console.log('Found SESS cookies:', sessCookies);
    const { claimURL, claimPassword } = await chrome.storage.sync.get(['claimURL', 'claimPassword'])
    if (!claimURL || !claimPassword) {
      console.log('No claim URL found');
      return false;
    }
    console.log(claimURL, claimPassword);
    const url = new URL(claimURL);
    url.pathname = '/session'
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cookies: sessCookies,
        serverToken: claimPassword
      })
    })
    console.log(response);
    if (response.status === 200) {
      console.log('Cookies submitted');
      return true;
    } else {
      console.log('Submission failed');
      return false;
    } 
  } catch (e) {
    console.error(e);
    console.log('Submission failed');
    return false;
  }
}

let lastMainRun = 0;
const ONE_HOUR = 60 * 60 * 1000;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('schoology.com')
  ) {
    const now = Date.now();
    if (now - lastMainRun > ONE_HOUR) {
      lastMainRun = now;
      main();
    }
  }
});
