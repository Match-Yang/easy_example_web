const now = new Date().getTime()
const config = {
    // Get your AppID from ZEGOCLOUD Console
    //[My Projects] : https://console.zegocloud.com/project
    appID: appID,
    // Get your Server from ZEGOCLOUD Console
    // [My Projects -> project's Edit -> Basic Configurations -> Server URL] : https://console.zegocloud.com/project"
    serverURL: serverURL,
    userID: 'user_' + now,
    userName: 'user_' + now,
    roomID: document.querySelector('#roomID').value
};
const data = {
    cameraEnable: true,
    micEnable: true,
    isHost: true,
    isSeat: false,
    coHostID: null,
    hostID: null,
}

initSDK();

function generateToken() {
    // Obtain the token interface provided by the App Server
    return Promise.resolve({data: { token: '' }});
}
function initSDK() {
    ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
    ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomUserUpdate]', updateType, userList, roomID);
        userList.forEach((userID) => {
            if (updateType === 'ADD') {
                if (data.hostID === userID) {
                    triggerRenderViewCon1(true, ZegoExpressManager.shared.getRemoteVideoView(userID));
                }
            } else {
                if (data.coHostID === userID) {
                    ZegoExpressManager.shared.setRoomExtraInfo('coHostID', '-');
                    data.coHostID = '-';
                    triggerRenderViewCon2(false)
                }
            }
        });
    })
    ZegoExpressManager.shared.onRoomUserDeviceUpdate((updateType, userID, roomID) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomUserDeviceUpdate]', updateType, userID, roomID);
    })
    ZegoExpressManager.shared.onRoomTokenWillExpire(async (roomID) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomTokenWillExpire]', roomID);
        const token = (await generateToken()).data.token;
        ZegoExpressManager.getEngine().renewToken(token);
    })
    ZegoExpressManager.shared.onRoomExtraInfoUpdate((roomExtraInfoList) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomExtraInfoUpdate]', roomExtraInfoList);
        roomExtraInfoList.forEach((roomExtraInfo) => {
            if (roomExtraInfo.key === 'coHostID') {
                // Audience
                data.coHostID = roomExtraInfo.value;

                if (roomExtraInfo.value === '-') {
                    triggerRenderViewCon2(false);
                } else {
                    triggerRenderViewCon2(true, ZegoExpressManager.shared.getRemoteVideoView(data.coHostID));
                }
            } else if (roomExtraInfo.key === 'hostID') {
                // Host
                data.hostID = roomExtraInfo.value;

                triggerRenderViewCon1(true, ZegoExpressManager.shared.getRemoteVideoView(data.hostID));
            }
        });
    })
    ZegoExpressManager.shared.onRoomStateUpdate((state) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomStateUpdate]', state);
        // state: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
        if (state === 'CONNECTED' && data.isHost) {
            ZegoExpressManager.shared.setRoomExtraInfo('hostID', config.userID);
            data.hostID = config.userID;
        }
    })

    // Check
    ZegoExpressManager.shared.checkWebRTC();
    ZegoExpressManager.shared.checkCamera();
    ZegoExpressManager.shared.checkMicrophone();
}
async function joinLiveAsHost() {
    data.isHost = true;

    const roomID = document.querySelector('#roomID').value;
    if (!roomID) { return; }
    config.roomID = roomID;

    const token = (await generateToken()).data.token;
    await ZegoExpressManager.shared.joinRoom(roomID, token, { userID: config.userID, userName: config.userName }, [1, 2, 4, 8]);

    triggerPageView('main');
    triggerRenderViewCon1(true, ZegoExpressManager.shared.getLocalVideoView());
    triggerSeatView(false);
}
async function joinLiveAsAudience() {
    data.isHost = false;

    const roomID = document.querySelector('#roomID').value;
    if (!roomID) { return; }
    config.roomID = roomID;

    const token = (await generateToken()).data.token;
    await ZegoExpressManager.shared.joinRoom(roomID, token, { userID: config.userID, userName: config.userName }, [1, 2]);

    triggerPageView('main');
    triggerCameraView(false);
    triggerMicView(false);
    triggerSeatView(true);
}
function seatHandle() {
    !data.isSeat ? up() : down();
}
function up() {
    if (data.coHostID && data.coHostID !== '-') {
        // There's someone at the mic
        return;
    }
    triggerRenderViewCon2(true, ZegoExpressManager.shared.getLocalVideoView());

    ZegoExpressManager.shared.enableCamera(true);
    ZegoExpressManager.shared.enableMic(true);
    ZegoExpressManager.shared.setRoomExtraInfo('coHostID', config.userID);

    data.coHostID = config.userID;
    data.isSeat = true;

    triggerCameraView(true);
    triggerMicView(true);
}
function down() {
    ZegoExpressManager.shared.enableCamera(false);
    ZegoExpressManager.shared.enableMic(false);
    ZegoExpressManager.shared.setRoomExtraInfo('coHostID', '-');

    data.coHostID = '-';
    data.isSeat = false
    
    triggerRenderViewCon2(false);
    triggerCameraView(false);
    triggerMicView(false);
}
function enableCamera() {
    const result = ZegoExpressManager.shared.enableCamera(!data.cameraEnable);
    result && (data.cameraEnable = !data.cameraEnable)
}
function enableMic() {
    result = ZegoExpressManager.shared.enableMic(!data.micEnable);
    result && (data.micEnable = !data.micEnable)
}
function leaveRoom() {
    ZegoExpressManager.shared.leaveRoom();
    triggerRenderViewCon1(false);
    triggerRenderViewCon2(false);
    triggerPageView('home');
}
// Dom
function triggerPageView(page) {
    const homePageView = document.querySelector('#home-page');
    const mainPageView = document.querySelector('#main-page');
    if (page === 'home') {
        homePageView.classList.remove('hide');
        mainPageView.classList.add('hide');
    } else {
        homePageView.classList.add('hide');
        mainPageView.classList.remove('hide');
    }
}
function triggerRenderViewCon1(show, videoDom) {
    const renderViewCon1 = document.querySelector('#video-con1');
    if (show) {
        renderViewCon1.innerHTML = '';   
        renderViewCon1.appendChild(videoDom);
        renderViewCon1.classList.remove('hide');
    } else {
        renderViewCon1.innerHTML = '';
        renderViewCon1.classList.add('hide');
    }
}
function triggerRenderViewCon2(show, videoDom) {
    const renderViewCon2 = document.querySelector('#video-con2');
    if (show) {
        renderViewCon2.innerHTML = '';   
        renderViewCon2.appendChild(videoDom);
        renderViewCon2.classList.remove('hide');
    } else {
        renderViewCon2.innerHTML = '';
        renderViewCon2.classList.add('hide');
    }
}
function triggerSeatView(show) {
    const seatView = document.querySelector('#seat-con');
    show ? seatView.classList.remove('hide') : seatView.classList.add('hide');
}
function triggerCameraView(show) {
    const cameraView = document.querySelector('#camera-con');
    show ? cameraView.classList.remove('hide') : cameraView.classList.add('hide');
}
function triggerMicView(show) {
    const micView = document.querySelector('#mic-con');
    show ? micView.classList.remove('hide') : micView.classList.add('hide');
}
