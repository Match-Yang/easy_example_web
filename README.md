# ZEGOCLOUD easy example

ZEGOCLOUD's easy example is a simple wrapper around our RTC product. You can refer to the sample code for quick integration.

## Getting started

The following will describe how to start this project.

### Prerequisites

* Create a project in [ZEGOCLOUD Admin Console](https://console.zegocloud.com/). For details, see [ZEGO Admin Console - Project management](https://docs.zegocloud.com/article/1271).

### Install

1. Clone the easy example Github repository.
2. Open Terminal, navigate to the `easy_example_web` folder.
3. Run the `npm install` command to install all dependencies that are needed.

### Modify the project configurations

![config](/media/init.png)

* You need to modify `appID` and `serverURL` to your own account, which can be obtained in the [ZEGO Admin Console](https://console.zegocloud.com/).
* [Generate a Token on your app server (recommended)](https://docs.zegocloud.com/article/11648), provide an interface for the client to call and replace the generateToken method above.

### Run the sample code

Start the project locally with the following command.

```ssh
# Start a local service
npm run dev
```

## Integrate the SDK into your own project

The following will describe how to build your own project based on this project.

### Copy the source code

Copy the `ZegoExpressManager.ts` and `ZegoExpressManager.entity.ts` files to your typescript project.

![project](media/project.png)

If your project is implemented in JavaScript, you need to execute the package command first and then copy the ZegoExpressManager.js file to the project.

```ssh
# Packaging ZegoExpressManager
npm run build:dev

# Package ZegoExpressManager and compress the code
npm run build
```

![package](media/package.png)

### Method call

The calling sequence of the SDK interface is as follows:
createEngine --> onRoomUserUpdate、onRoomUserDeviceUpdate、onRoomTokenWillExpire、onRoomExtraInfoUpdate、onRoomStateUpdate --> checkWebRTC --> checkCamera --> checkMicrophone --> joinRoom --> getLocalVideoView/getRemoteVideoView --> enableCamera、enableMic --> leaveRoom

#### Create engine

Before using the SDK function, you need to create the SDK first. We recommend creating it when the application starts. The sample code is as follows:

```typescript
ZegoExpressManager.shared.createEngine(config.appID, config.serverURL);
```

#### Register related callbacks

You can get information in the relevant callbacks and do your own thing.

```typescript
ZegoExpressManager.shared.onRoomUserUpdate((roomID, updateType, userList) => {
    // Do something...
});
ZegoExpressManager.shared.onRoomUserDeviceUpdate((updateType, userID, roomID) => {
    // Do something...
});
ZegoExpressManager.shared.onRoomTokenWillExpire((roomID) => {
    // Do something...
});
ZegoExpressManager.shared.onRoomExtraInfoUpdate((roomExtraInfoList) => {
    // Do something...
});
ZegoExpressManager.shared.onRoomStateUpdate((state) => {
    // Do something...
});
```

#### Check webRTC

Check browser compatibility with WebRTC.

```typescript
ZegoExpressManager.shared.checkWebRTC();
```

#### Check camera

Check whether the camera has permission to call.

```typescript
ZegoExpressManager.shared.checkCamera();
```

#### Check microphone

Check whether the microphone has permission to call.

```typescript
ZegoExpressManager.shared.checkMicrophone();
```

#### Join room

When you want to communicate with audio and video, you need to call the join room interface first. According to your business scenario, you can set different audio and video controls through options, such as:

ZegoMediaOptions enumeration can be found in src/ZegoExpressManager.entity.ts.

1. Join Live As Host: [ZegoMediaOptions.AutoPlayVideo, ZegoMediaOptions.AutoPlayAudio, ZegoMediaOptions.PublishLocalAudio, ZegoMediaOptions.PublishLocalVideo]
2. Join Live As Audience: [ZegoMediaOptions.AutoPlayVideo, ZegoMediaOptions.AutoPlayAudio]

The following sample code is an example of a live scenario:

```typescript
// Host
ZegoExpressManager.shared.joinRoom(roomID, token, { userID: config.userID, userName: config.userName }, [1, 2, 4, 8]);

// Audience
ZegoExpressManager.shared.joinRoom(roomID, token, { userID: config.userID, userName: config.userName }, [1, 2]);
```

#### Get video view

If your project needs to use the video communication function, you need to get the View for displaying the video, call `getLocalVideoView` for the local video, and call `getRemoteVideoView` for the remote video.

**getLocalVideoView:**

```html
<div id="video-con1"></div>
```

```typescript
const renderViewCon1 = document.querySelector('#video-con1');
const videoDom = ZegoExpressManager.shared.getLocalVideoView();
renderViewCon1.innerHTML = ''; 
renderViewCon1.appendChild(videoDom);
```

**getRemoteVideoView:**

```html
<div id="video-con2"></div>
```

```typescript
const renderViewCon2 = document.querySelector('#video-con2');
ZegoExpressManager.shared.onRoomUserUpdate((roomID, updateType, userList) => {
    userList.forEach(userID => {
        if (updateType === 'ADD') {
            const videoDom = ZegoExpressManager.shared.getRemoteVideoView(userID);
            renderViewCon2.innerHTML = '';
            renderViewCon2.appendChild(videoDom);
        }
    });
});
```

#### Enable camera

```typescript
ZegoExpressManager.shared.enableCamera(enable);
```

#### Enable mic

```typescript
ZegoExpressManager.shared.enableMic(enable);
```

#### Leave room

When you want to leave the room, you can call the leaveroom interface.

```typescript
ZegoExpressManager.shared.leaveRoom();
```

## Change Log

### 2022-05-12

#### New Features

1. Added live streaming scene with seat
