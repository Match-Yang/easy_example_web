var userID = getUserID(10);
var config = {
  appID: 1719562607,
  serverURL: "wss://webliveroom" + 1719562607 + "-api.zegocloud.com/ws",
  userID: userID,
  userName: "web-" + userID,
  tokenServerUrl: "https://easy-example-call.herokuapp.com",
  roomID: "hall",
  targetRoomID: "",
};
async function checkRequirements() {
  ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
  var isSupportRTC = await ZegoExpressManager.shared.checkWebRTC();
  var isCameraValid = await ZegoExpressManager.shared.checkCamera();
  var isMicValid = await ZegoExpressManager.shared.checkMicrophone();
  !isSupportRTC && alert("This browser does not support WebRTC");
  !isCameraValid && alert("This browser camera unavailable");
  !isMicValid && alert("This browser microphone unavailable");
}

function getUserID(len) {
  let result = "";
  var chars = "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP",
    maxPos = chars.length,
    i;
  len = len || 5;
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}
// dynamically load plugins
function loadScript(url, callback) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  // Compatible with IE
  if (script.readyState) {
    script.onreadystatechange = function () {
      if (script.readyState === "loaded" || script.readyState === "complete") {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {
    // handle the case of other browsers
    script.onload = function () {
      callback();
    };
  }
  script.src = url;
  document.body.append(script);
}

// load plugin
loadScript("./ZegoExpressManager.js", init);

// Render UI, bind click event
function init() {
  document.querySelector("#userID").innerHTML = userID;
  checkRequirements();
  initSDK();
}

function initSDK() {
  ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
  ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
    userList.forEach((userID) => {
      const target = document.getElementsByClassName(".userList ." + userID);
      if (updateType === "ADD" && target.length === 0) {
        document
          .querySelector(".userList")
          .appendChild(createUserContainer(userID));
      } else {
        target.length > 0 &&
          document.querySelector(".userList").removeChild(target[0]);
      }
    });
  });
  ZegoExpressManager.shared.onIMRecvCustomCommand(
    (roomID, fromUser, command) => {
      if (command === "invite") {
        showNotify(
          command,
          fromUser.userID + " " + command + " call",
          fromUser.userID
        );
      } else if (command === "agree") {
        window.location.href =
          "./call.html?roomID=" + config.userID + "&userID=" + config.userID;
      }
    }
  );
  joinRoom();
}

function createUserContainer(userID) {
  const _div = document.createElement("div");
  _div.innerHTML = `
      <label>userID:</label> <span>${userID}</span
      ><button>Call</button>
     `;
  _div.classList.add(userID, "line");
  _div.getElementsByTagName("button")[0].onclick = () => {
    ZegoExpressManager.shared.sendCustomCommand(config.roomID, "invite", [
      userID,
    ]);
  };
  return _div;
}

async function joinRoom() {
  const tokenObj = await generateToken();
  await ZegoExpressManager.shared.joinRoom(
    config.roomID,
    tokenObj.token,
    {
      userID: config.userID,
      userName: config.userName,
    },
    [1, 2]
  );
}

function generateToken() {
  // Obtain the token interface provided by the App Server
  return fetch(
    `${config.tokenServerUrl}/access_token?uid=${config.userID}&expired_ts=7200`,
    {
      method: "GET",
    }
  ).then((res) => res.json());
}

function showNotify(title, body, roomID) {
  document.querySelector(".title").innerHTML = title;
  document.querySelector(".content").innerHTML = body;
  document.querySelector(".notify").style.display = "flex";
  document.querySelector(".notify .refuse").onclick = refuse;
  document.querySelector(".notify .accept").onclick = accept;
  config.targetRoomID = roomID;
}

function refuse() {
  document.querySelector(".notify").style.display = "none";
}

function accept() {
  // enter room
  ZegoExpressManager.shared.sendCustomCommand(config.roomID, "agree", [
    config.targetRoomID,
  ]);
  window.location.href =
    "./call.html?roomID=" + config.targetRoomID + "&userID=" + config.userID;
}
