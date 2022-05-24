// SDK basic configuration
var config = {
  appID: 0000000,
  serverURL: "wss://webliveroom" + 0000000 + "-api.zegocloud.com/ws",
  tokenServerUrl: "https://xxxxxx.herokuapp.com",
  targetRoomID: "",
  userID: getUserID(10),
};

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
  document.querySelector("#userID").innerHTML = config.userID;
  checkRequirements();
  document.querySelector(".user button").addEventListener("click", goCall);
  document.querySelectorAll(".publishHandler button").forEach((value) => {
    value.addEventListener("click", function () {
      if (value.classList.contains("off")) {
        value.classList.remove("off");
      } else {
        value.classList.add("off");
      }

      if (value.classList.contains("mic")) {
        enableMic(value.classList.contains("off"));
      } else if (value.classList.contains("camera")) {
        enableCamera(value.classList.contains("off"));
      } else {
        leaveRoom();
      }
    });
  });
}

// Generate random userID
function getUserID(len) {
  let result = "";
  if (result) return result;
  var chars = "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP",
    maxPos = chars.length,
    i;
  len = len || 5;
  for (i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

// Compatibility check
// Microphone availability check
// camera availability check
async function checkRequirements() {
  ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
  var isSupportRTC = await ZegoExpressManager.shared.checkWebRTC();
  var isCameraValid = await ZegoExpressManager.shared.checkCamera();
  var isMicValid = await ZegoExpressManager.shared.checkMicrophone();
  !isSupportRTC && alert("This browser does not support WebRTC");
  !isCameraValid && alert("This browser camera unavailable");
  !isMicValid && alert("This browser microphone unavailable");
}

function initSDK() {
  ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
  ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
    userList.forEach((userID) => {
      if (updateType === "ADD") {
        console.warn("roomUserUpdate");
        const videoDom = ZegoExpressManager.shared.getRemoteVideoView(userID);

        document
          .querySelector(".user2")
          .replaceChild(videoDom, document.querySelector(".user2 video"));
      } else {
        var remoteVideo = document.createElement("video");
        remoteVideo.controls = true;
        document
          .querySelector(".user2")
          .replaceChild(remoteVideo, document.querySelector(".user2 video"));
      }
    });
  });
  ZegoExpressManager.shared.onRoomUserDeviceUpdate(
    (updateType, userID, roomID) => {
      console.warn(updateType, userID, roomID);
    }
  );
  ZegoExpressManager.shared.onRoomTokenWillExpire(async (roomID) => {
    const token = (await generateToken()).data.token;
    ZegoExpressManager.getEngine().renewToken(token);
  });

  joinRoom();
}

// start the call
function goCall() {
  if (document.querySelector("#roomID").value) {
    document.querySelector(".user").style.display = "none";
    document.querySelector(".call").style.display = "block";
    initSDK();
  } else {
    setTimeout(function () {
      document.querySelector("#roomID").focus();
    }, 500);
  }
}

// enter the room
async function joinRoom() {
  const tokenObj = await generateToken();
  await ZegoExpressManager.shared.joinRoom(
    document.querySelector("#roomID").value,
    tokenObj.token,
    {
      userID: config.userID,
      userName: config.userID,
    }
  );
  const videoDom = ZegoExpressManager.shared.getLocalVideoView();
  videoDom.controls = true;
  document
    .querySelector(".user1")
    .replaceChild(videoDom, document.querySelector(".user1 video"));
}

// turn the camera on/off
function enableCamera(cameraEnable) {
  const result = ZegoExpressManager.shared.enableCamera(!cameraEnable);
  result && (cameraEnable = !cameraEnable);
}
// switch microphone
function enableMic(micEnable) {
  result = ZegoExpressManager.shared.enableMic(!micEnable);
  result && (micEnable = !micEnable);
}

// leave the room
function leaveRoom() {
  ZegoExpressManager.shared.leaveRoom();
  setTimeout(function () {
    document.querySelector(".user").style.display = "block";
    document.querySelector(".call").style.display = "none";
  }, 1000);
}

// 生成token
function generateToken() {
  // Obtain the token interface provided by the App Server
  return fetch(
    `${config.tokenServerUrl}/access_token?uid=${config.userID}&expired_ts=7200`,
    {
      method: "GET",
    }
  ).then((res) => res.json());
}
