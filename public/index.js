const now = new Date().getTime()
const config = {
    // Get your AppID from ZEGOCLOUD Console
    //[My Projects] : https://console.zegocloud.com/project
    appID: appID,
    // Get your Server from ZEGOCLOUD Console
    // [My Projects -> project's Edit -> Basic Configurations -> Server URL] : https://console.zegocloud.com/project"
    serverURL: serverURL,
    userID: 'web_user_' + now,
    userName: 'web_user_' + now,
    roomID: 'web_room_123'
};
const renderView1 = document.querySelector('#video-con1');
const renderView2 = document.querySelector('#video-con2');
var cameraEnable = true;
var micEnable = true;

function generateToken() {
    // Obtain the token interface provided by the App Server
    return Promise.resolve({data: { token: '' }});
}
function initSDK() {
    ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
    ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
        userList.forEach(userID => {
            if (updateType === 'ADD') {
                console.warn("roomUserUpdate");
                const videoDom = ZegoExpressManager.shared.getRemoteVideoView(userID)
                renderView2.appendChild(videoDom);
            } else {
                renderView2.innerHTML = '';
            }
        });
    })
    ZegoExpressManager.shared.onRoomUserDeviceUpdate((updateType, userID, roomID) => {
        console.warn(updateType, userID, roomID)
    })
    ZegoExpressManager.shared.onRoomTokenWillExpire(async (roomID) => {
        const token = (await generateToken()).data.token;
        ZegoExpressManager.getEngine().renewToken(token);
    })
    alert('init success');
}
async function checkWebRTC() {
    await ZegoExpressManager.shared.checkWebRTC();
    alert('check success');
}
async function checkCamera() {
    await ZegoExpressManager.shared.checkCamera();
    alert('check success');
}
async function checkMicrophone() {
    await ZegoExpressManager.shared.checkMicrophone();
    alert('check success');
}
async function joinRoom() {
    const token = (await generateToken()).data.token
    await ZegoExpressManager.shared.joinRoom(config.roomID, token, { userID: config.userID, userName: config.userName });
    const videoDom = ZegoExpressManager.shared.getLocalVideoView()
    renderView1.appendChild(videoDom);
    alert('join success');
}
function enableCamera() {
    const result = ZegoExpressManager.shared.enableCamera(!cameraEnable);
    result && (cameraEnable = !cameraEnable)
    alert('switch success');
}
function enableMic() {
    result = ZegoExpressManager.shared.enableMic(!micEnable);
    result && (micEnable = !micEnable)
    alert('switch success');
}
function leaveRoom() {
    ZegoExpressManager.shared.leaveRoom();
    renderView1.innerHTML = '';
    renderView2.innerHTML = '';
    alert('leave success');
}