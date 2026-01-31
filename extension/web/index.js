const serverURL = document.getElementById('schoology-server-url');
const serverPassword = document.getElementById('schoology-server-password');

const submitButton = document.getElementById('submit-config');
submitButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'send-claim', data: { claimURL: serverURL.value, claimPassword: serverPassword.value } }, ({ success }) => {
    if (success) {
      submitButton.style.background = 'green';
      submitButton.innerText = 'Config saved';
    } else {
      submitButton.style.background = 'red';
      submitButton.innerText = 'Error';
    }

    setTimeout(() => {
      submitButton.style.background = 'white';
      submitButton.innerText = 'Submit';
    }, 1000);
  });
});

chrome.runtime.sendMessage({ type: 'get-claim' }, (response) => {
  serverURL.value = response.claimURL || '';
  serverPassword.value = response.claimPassword || '';
  console.log(response);
});
