const now = new Date().getTime() + '';
const config = {
    // Get your AppID from ZEGOCLOUD Console
    //[My Projects] : https://console.zegocloud.com/project
    appID: appID,
    // Get your Server from ZEGOCLOUD Console
    // [My Projects -> project's Edit -> Basic Configurations -> Server URL] : https://console.zegocloud.com/project"
    serverURL: serverURL,
    userID: 'user_' + now.slice(5),
    userName: 'user_' + now.slice(5),
    roomID: document.querySelector('#roomID').value
};
const data = {
    cameraEnable: true,
    micEnable: true,
    isSeat: false,
    userList: new Map()
}
initSDK();
function generateToken() {
    // Obtain the token interface provided by the App Server
    return Promise.resolve({ data: { token: '' } });
}
function initSDK() {
    ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
    ZegoExpressManager.shared.onRoomUserUpdate((updateType, userList, roomID) => {
        // Role 0: Host, 1: Co-host, 2: Audience
        console.warn('[ZEGOCLOUD Log][Demo][onRoomUserUpdate]', updateType, userList, roomID);
        userList.forEach((user) => {
            const { role, userID } = user;
            if (updateType === "UPDATE" || updateType === "ADD") {
                data.userList.set(userID, user);
                if (role === 0) {
                    // Host join the room
                    triggerRenderHostViewCon(true, userID, ZegoExpressManager.shared.getRemoteVideoView(userID));
                } else if (role === 1) {
                    // Audience take the co-host seat
                    triggerRenderCoHostViewCon(true, userID, ZegoExpressManager.shared.getRemoteVideoView(userID));
                } else {
                    if (updateType === "UPDATE") {
                        // Co-host leave the co-host seat, becomes the audience
                        triggerRenderHostViewCon(false, userID);
                        triggerRenderCoHostViewCon(false, userID);
                    }
                }
            } else {
                data.userList.delete(userID);
                if (role === 0) {
                    // Host leave the room
                    triggerRenderHostViewCon(false, userID);
                } else if (role === 1) {
                    // Co-host leave the room
                    triggerRenderCoHostViewCon(false, userID);
                } else {
                    // Audience leave the room
                    triggerRenderHostViewCon(false, userID);
                    triggerRenderCoHostViewCon(false, userID);
                }
            }
        });
        updateUserListView(userList, updateType);
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
    })
    ZegoExpressManager.shared.onRoomStateUpdate((state) => {
        console.warn('[ZEGOCLOUD Log][Demo][onRoomStateUpdate]', state);
    })
    ZegoExpressManager.shared.onInvitedJoinLive(() => {
        const result = confirm("Received the invitation of taking the co-host seat, are you sure you want to connect?");
        result && !data.isSeat && seatManagement();
    })
    ZegoExpressManager.shared.onBroadcastMessageRecv((msgList) => {
        console.warn('[ZEGOCLOUD Log][Demo][onBroadcastMessageRecv]', msgList);
        updateMsgListView(msgList);
    })
    ZegoExpressManager.shared.onKickedOutRoom(() => {
        console.warn('[ZEGOCLOUD Log][Demo][onKickedOutRoom]');
        postLeaveRoom();
    });
    ZegoExpressManager.shared.onMuteCohostMicrophone(() => {
        console.warn('[ZEGOCLOUD Log][Demo][onMuteCohostMicrophone]');
        data.micEnable = false;
    });
    ZegoExpressManager.shared.onMuteCohostCamera(() => {
        console.warn('[ZEGOCLOUD Log][Demo][onMuteCohostCamera]');
        data.cameraEnable = false;
    });

    // Check
    ZegoExpressManager.shared.checkWebRTC();
    ZegoExpressManager.shared.checkCamera();
    ZegoExpressManager.shared.checkMicrophone();
}
async function joinLiveAsHost() {
    const roomID = document.querySelector('#roomID').value;
    if (!roomID) { return; }
    config.roomID = roomID;

    alert('Joining the room, please wait a moment');

    const token = (await generateToken()).data.token;
    const user = { userID: config.userID, userName: config.userName };
    data.userList.set(config.userID, { ...user, role: 0 })
    await ZegoExpressManager.shared.joinRoom(roomID, token, user, [1, 2, 4, 8]);

    triggerPageView('main');
    triggerRenderHostViewCon(true, config.userID, ZegoExpressManager.shared.getLocalVideoView());
    updateUserListView([{ ...user, role: 0 }], 'ADD');

}
async function joinLiveAsAudience() {
    const roomID = document.querySelector('#roomID').value;
    if (!roomID) { return; }
    config.roomID = roomID;

    alert('Joining the room, please wait a moment');

    const token = (await generateToken()).data.token;
    const user = { userID: config.userID, userName: config.userName };
    data.userList.set(config.userID, { ...user, role: 2 })
    await ZegoExpressManager.shared.joinRoom(roomID, token, user, [1, 2]);


    triggerPageView('main');
    triggerCameraView(false);
    triggerMicView(false);
    triggerSeatView(true);
    updateUserListView([{ ...user, role: 2 }], 'ADD');
}
function seatManagement() {
    !data.isSeat ? takeCoHostSeat() : leaveCoHostSeat();
    updateUserListView([data.userList.get(config.userID)], 'UPDATE');
}
function takeCoHostSeat() {
    console.warn('[ZEGOCLOUD Log][Demo][takeCoHostSeat]');
    triggerRenderCoHostViewCon(true, config.userID, ZegoExpressManager.shared.getLocalVideoView());

    ZegoExpressManager.shared.enableCamera(true);
    ZegoExpressManager.shared.enableMic(true);

    data.userList.get(config.userID).role = 1;
    data.isSeat = true;
}
function leaveCoHostSeat() {
    console.warn('[ZEGOCLOUD Log][Demo][leaveCoHostSeat]');
    ZegoExpressManager.shared.enableCamera(false);
    ZegoExpressManager.shared.enableMic(false);

    data.userList.get(config.userID).role = 2;
    data.isSeat = false

    triggerRenderCoHostViewCon(false, config.userID);
}
function enableCamera(userID) {
    const ownRole = data.userList.get(config.userID).role;
    if (ownRole === 0 && userID === undefined || ownRole !== 0 && userID === config.userID) {
        // Turn off your own camera
        const result = ZegoExpressManager.shared.enableCamera(!data.cameraEnable);
        result && (data.cameraEnable = !data.cameraEnable);
    } else {
        // The host turns off the camera of the designated person
        ZegoExpressManager.shared.muteCohostCamera([userID]);
    }
}
function enableMic(userID) {
    const ownRole = data.userList.get(config.userID).role;
    if (ownRole === 0 && userID === undefined || ownRole !== 0 && userID === config.userID) {
        // Turn off your own microphone
        const result = ZegoExpressManager.shared.enableMic(!data.micEnable);
        result && (data.micEnable = !data.micEnable);
    } else {
        // The host turns off the microphone of the designated person
        ZegoExpressManager.shared.muteCohostMicrophone([userID]);
    }

}
function inviteJoinLive(userID) {
    ZegoExpressManager.shared.inviteJoinLive([userID]);
}
function sendBroadcastMessage() {
    const inputView = document.querySelector('#message-input-con input');
    ZegoExpressManager.shared.sendBroadcastMessage(inputView.value).then((result) => {
        if (result) {
            console.warn('[ZEGOCLOUD Log][Demo][sendBroadcastMessage] - Success');
            updateMsgListView([{ fromUser: { userID: config.userID, userName: config.userName }, message: inputView.value }]);
            inputView.value = '';
        }
    });
}
document.querySelector('#message-input-con input').addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        sendBroadcastMessage();
    }
})
function leaveRoom() {
    ZegoExpressManager.shared.leaveRoom();

    postLeaveRoom();
}
function postLeaveRoom() {
    data.cameraEnable = true;
    data.micEnable = true;
    data.isSeat = false
    data.userList.clear();

    updateUserListView();
    updateMsgListView();
    triggerCameraView(true);
    triggerMicView(true);
    triggerSeatView(false);
    triggerRenderHostViewCon(false);
    triggerRenderCoHostViewCon(false);
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
function triggerRenderHostViewCon(show, userID, videoDom) {
    const hostListView = document.querySelector('#host-list');
    if (show) {
        triggerRenderHostViewCon(false, userID);

        const hostConView = document.createElement('div');
        hostConView.id = "host-con" + userID;
        hostConView.appendChild(videoDom);
        hostListView.appendChild(hostConView);
    } else {
        const hostConView = hostListView.querySelector('[id^=host-con' + (userID || '') + ']');
        hostConView && hostConView.remove();
    }
}
function triggerRenderCoHostViewCon(show, userID, videoDom) {
    const coHostListView = document.querySelector('#cohost-list');
    if (show) {
        triggerRenderCoHostViewCon(false, userID);

        const cohostConView = document.createElement('div');
        cohostConView.id = "cohost-con" + userID;
        cohostConView.appendChild(videoDom);

        if (data.userList.get(config.userID).role === 0 || config.userID === userID) {
            const operateConView = document.createElement('div');
            operateConView.setAttribute('class', 'operate-con');
            operateConView.innerHTML =
                '<div class="camera-con small">' +
                '<img onclick="enableCamera(\'' + userID + '\')" src="./img/icon_camera.png" alt="camera" />' +
                '</div>' +
                '<div class="mic-con small">' +
                '<img onclick="enableMic(\'' + userID + '\')" src="./img/icon_mic.png" alt="mic" />' +
                '</div>';
            cohostConView.appendChild(operateConView);
        }

        coHostListView.appendChild(cohostConView);

    } else {
        const cohostConViewList = coHostListView.querySelectorAll('[id^=cohost-con' + (userID || '') + ']');
        cohostConViewList.forEach((cohostConView) => {
            cohostConView.remove();
        })
    }
}
function triggerSeatView(show) {
    const seatView = document.querySelector('#host-list .seat-con');
    show ? seatView.classList.remove('hide') : seatView.classList.add('hide');
}
function triggerCameraView(show) {
    const cameraView = document.querySelector('#host-list .camera-con');
    show ? cameraView.classList.remove('hide') : cameraView.classList.add('hide');
}
function triggerMicView(show) {
    const micView = document.querySelector('#host-list .mic-con');
    show ? micView.classList.remove('hide') : micView.classList.add('hide');
}
function updateUserListView(userList, updateType) {
    const userListView = document.querySelector('#user-list');
    if (!userList) {
        // Clear
        userListView.innerHTML = '';
        return;
    }

    const ownRole = data.userList.get(config.userID).role;
    userList.forEach((user) => {
        const { userID, userName, role } = user;
        const roleName = role === 0 ? 'host' : role === 1 ? 'co-host' : 'audience';
        if (updateType === 'ADD') {
            // Add
            const userItemView = document.createElement('div');
            if (ownRole === 0 && userID !== config.userID) {
                userItemView.innerHTML =
                    '<div class="user-item' +
                    userID +
                    '"><span class="item-text">' +
                    userName +
                    '(' + roleName + ')</span><span class="item-btn" onclick="inviteJoinLive(\'' + userID + '\')">invite</span></div>';
            } else {
                userItemView.innerHTML =
                    '<div class="user-item' +
                    userID +
                    '"><span class="item-text">' +
                    userName +
                    '(' + roleName + ')</span></div>';
            }
            // Host are first in line
            role === 0 ? userListView.append(userItemView) : userListView.appendChild(userItemView);
        } else if (updateType === 'UPDATE') {
            // Update
            const itemTextView = userListView.querySelector('.user-item' + userID + ' .item-text');
            itemTextView.innerHTML = itemTextView.innerHTML.replace(/\((\S+)\)/gi, '(' + roleName + ')');
        } else {
            // Delete
            const userItemView = userListView.querySelector('.user-item' + userID);
            userItemView.remove();
        }
    })
}
function updateMsgListView(msgList) {
    const messageListView = document.querySelector('#message-list');
    if (!msgList) {
        // Clear
        messageListView.innerHTML = '';
        return;
    }
    const fragment = document.createDocumentFragment();
    msgList.forEach((msg) => {
        const messageItemView = document.createElement('div');
        messageItemView.innerHTML = '<div class="message-item"><span>' + msg.fromUser.userName + '</span>:<span>' + msg.message + '</span></div>';
        fragment.appendChild(messageItemView);
    });
    messageListView.appendChild(fragment);
}
