import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import {
  ZegoCapabilityDetection,
  ZegoPlayStats,
  ZegoPublishStats,
  ZegoServerResponse,
  ZegoStreamList,
} from "zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.web";
import {
  ZegoRoomExtraInfo,
  ZegoUser,
  ZegoBroadcastMessageInfo,
} from "zego-express-engine-webrtm/sdk/code/zh/ZegoExpressEntity";
import {
  ZegoVideoViewType,
  ZegoDeviceUpdateType,
  ZegoMediaOptions,
  ZegoParticipant,
  ZegoRoomConfig,
  ZegoRoomUser,
  ZegoUserRole,
} from "./ZegoExpressManager.entity";

export class ZegoExpressManager {
  // key is UserID, value is participant model
  private participantDic: Map<string, ZegoParticipant> = new Map();
  // key is streamID, value is participant model
  private streamDic: Map<string, ZegoParticipant> = new Map();
  private localParticipant!: ZegoParticipant;
  private roomID = "";
  private streamMap: Map<string, MediaStream> = new Map();
  private roleMap: Map<string, ZegoUserRole> = new Map();
  private mediaOptions: ZegoMediaOptions[] = [];
  private deviceUpdateCallback: ((
    updateType: ZegoDeviceUpdateType,
    userID: string,
    roomID: string
  ) => void)[] = [];
  private roomUserUpdateCallback: ((
    updateType: "DELETE" | "ADD" | "UPDATE",
    userList: ZegoRoomUser[],
    roomID: string
  ) => void)[] = [];
  private muteCohostMicrophoneCallback: (() => void)[] = [];
  private muteCohostCameraCallback: (() => void)[] = [];
  private invitedLiveJoinCallback: (() => void)[] = [];
  private kickedOutRoomCallback: (() => void)[] = [];
  private roomExtraInfoCallback: ((
    roomExtraInfoList: ZegoRoomExtraInfo[]
  ) => void)[] = [];
  private isPublish = false;
  private hostLogoutKey = "mgLogout";
  private inviteKey = "mgInvite";
  private muteMicKey = "mgMuteMic";
  private muteCameraKey = "mgMuteCamera";
  static shared: ZegoExpressManager = new ZegoExpressManager();
  static engine: ZegoExpressEngine;
  private constructor() {
    if (!ZegoExpressManager.shared) {
      this.localParticipant = {} as ZegoParticipant;
      ZegoExpressManager.shared = this;
    }
    return ZegoExpressManager.shared;
  }
  static getEngine() {
    return ZegoExpressManager.engine;
  }
  createEngine(appID: number, server: string) {
    if (!ZegoExpressManager.engine) {
      ZegoExpressManager.engine = new ZegoExpressEngine(appID, server);
      this.onOtherEvent();
    }
  }
  checkWebRTC(): Promise<boolean> {
    return ZegoExpressManager.engine
      .checkSystemRequirements("webRTC")
      .then((data: ZegoCapabilityDetection) => {
        return !!data.result;
      });
  }
  checkCamera(): Promise<boolean> {
    return ZegoExpressManager.engine
      .checkSystemRequirements("camera")
      .then((data: ZegoCapabilityDetection) => {
        return !!data.result;
      });
  }
  checkMicrophone(): Promise<boolean> {
    return ZegoExpressManager.engine
      .checkSystemRequirements("microphone")
      .then((data: ZegoCapabilityDetection) => {
        return !!data.result;
      });
  }
  joinRoom(
    roomID: string,
    token: string,
    user: ZegoUser,
    options: ZegoMediaOptions[]
  ): Promise<boolean> {
    if (!token) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][joinRoom] - Token is empty, please enter a right token"
      );
      return Promise.resolve(false);
    }
    if (!options) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][joinRoom] - Options is empty, please enter a right options"
      );
      return Promise.resolve(false);
    }
    options = this.transFlutterData(options) as ZegoMediaOptions[];
    this.roomID = roomID;
    this.mediaOptions = options.map((e) =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typeof e === "object" ? e.index : e
    );
    user = this.transFlutterData(user) as ZegoRoomUser;

    const publishLocalAudio = this.mediaOptions.includes(
      ZegoMediaOptions.PublishLocalAudio
    );
    const publishLocalVideo = this.mediaOptions.includes(
      ZegoMediaOptions.PublishLocalVideo
    );
    this.roleMap.set(
      user.userID,
      publishLocalAudio || publishLocalVideo
        ? ZegoUserRole.Host
        : ZegoUserRole.Audience
    );

    this.localParticipant.userID = user.userID;
    this.localParticipant.name = user.userName;
    this.localParticipant.streamID = this.generateStreamID(user.userID, roomID);

    this.participantDic.set(
      this.localParticipant.userID,
      this.localParticipant
    );
    this.streamDic.set(this.localParticipant.streamID, this.localParticipant);

    const config: ZegoRoomConfig = {
      userUpdate: true,
      maxMemberCount: 4,
    };
    return ZegoExpressManager.engine
      .loginRoom(roomID, token, user, config)
      .then(async (result) => {
        if (result) {
          console.warn("[ZEGOCLOUD LOG][Manager][loginRoom] - Login success");
          const localStream = await this.createStream();
          this.streamMap.set(this.localParticipant.streamID, localStream);

          this.localParticipant.mic = publishLocalAudio;
          this.localParticipant.camera = publishLocalVideo;

          if (this.localParticipant.camera || this.localParticipant.mic) {
            // Determine if srcObject has been updated
            if (
              this.localParticipant.renderView &&
              !this.localParticipant.renderView.srcObject
            ) {
              this.localParticipant.renderView.srcObject = localStream;
            }
            ZegoExpressManager.engine.mutePublishStreamAudio(
              localStream,
              !this.localParticipant.mic
            );
            ZegoExpressManager.engine.mutePublishStreamVideo(
              localStream,
              !this.localParticipant.camera
            );
            console.warn(
              "[ZEGOCLOUD LOG][Manager][mutePublishStreamAudio] - Mute success",
              !this.localParticipant.mic
            );
            console.warn(
              "[ZEGOCLOUD LOG][Manager][mutePublishStreamVideo] - Mute success",
              !this.localParticipant.camera
            );
            const result = ZegoExpressManager.engine.startPublishingStream(
              this.localParticipant.streamID,
              localStream
            );
            if (result) {
              console.warn(
                "[ZEGOCLOUD LOG][Manager][startPublishingStream] - Publish success"
              );
              this.isPublish = true;
            }
          }
        }
        return result;
      });
  }
  enableCamera(enable: boolean): boolean {
    const streamID = this.localParticipant.streamID;
    const streamObj = this.streamMap.get(streamID) as MediaStream;
    const result = ZegoExpressManager.engine.mutePublishStreamVideo(
      streamObj,
      !enable
    );

    if (result) {
      console.warn(
        "[ZEGOCLOUD LOG][Manager][mutePublishStreamVideo] - Mute success",
        !enable
      );
      this.localParticipant.camera = enable;
      this.triggerStreamHandle("camera", enable);
    }
    return result;
  }
  enableMic(enable: boolean): boolean {
    const streamID = this.localParticipant.streamID;
    const streamObj = this.streamMap.get(streamID) as MediaStream;
    const result = ZegoExpressManager.engine.mutePublishStreamAudio(
      streamObj,
      !enable
    );
    if (result) {
      console.warn(
        "[ZEGOCLOUD LOG][Manager][mutePublishStreamAudio] - Mute success",
        !enable
      );
      this.localParticipant.mic = enable;
      this.triggerStreamHandle("mic", enable);
    }
    return result;
  }
  inviteJoinLive(userIDList: string[]): Promise<boolean> {
    return ZegoExpressManager.engine
      .sendCustomCommand(this.roomID, this.inviteKey, userIDList)
      .then((result: ZegoServerResponse) => {
        if (result.errorCode === 0) {
          console.warn(
            "[ZEGOCLOUD LOG][Manager][inviteJoinLive] - Invite success"
          );
        }
        return result.errorCode === 0;
      });
  }
  muteCohostMicrophone(userIDList: string[]): Promise<boolean> {
    return ZegoExpressManager.engine
      .sendCustomCommand(this.roomID, this.muteMicKey, userIDList)
      .then((result: ZegoServerResponse) => {
        if (result.errorCode === 0) {
          console.warn(
            "[ZEGOCLOUD LOG][Manager][muteCohostMicrophone] - Mute success"
          );
        }
        return result.errorCode === 0;
      });
  }
  muteCohostCamera(userIDList: string[]): Promise<boolean> {
    return ZegoExpressManager.engine
      .sendCustomCommand(this.roomID, this.muteCameraKey, userIDList)
      .then((result: ZegoServerResponse) => {
        if (result.errorCode === 0) {
          console.warn(
            "[ZEGOCLOUD LOG][Manager][muteCohostCamera] - Mute success"
          );
        }
        return result.errorCode === 0;
      });
  }
  getLocalVideoView(): HTMLMediaElement {
    if (!this.roomID) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][getLocalVideoView] - You need to join the room first and then get the videoView"
      );
    }
    const { streamID, userID } = this.localParticipant;
    let renderView = this.localParticipant.renderView;
    if (!renderView) {
      renderView = this.generateVideoView(ZegoVideoViewType.Local, userID);
    }
    const streamObj = this.streamMap.get(streamID) as MediaStream;
    if (streamObj) {
      // Render now
      renderView.srcObject = streamObj;
    } else {
      // Delay rendering until stream is created successfully
    }
    this.localParticipant.renderView = renderView;
    this.participantDic.set(userID, this.localParticipant);
    this.streamDic.set(streamID, this.localParticipant);

    return renderView;
  }
  getRemoteVideoView(userID: string): HTMLMediaElement {
    if (!this.roomID) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][getRemoteVideoView] - You need to join the room first and then get the videoView"
      );
    }
    if (!userID) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][getRemoteVideoView] - UserID is empty, please enter a right userID"
      );
    }
    const participant = this.participantDic.get(userID) as ZegoParticipant;
    if (!participant.renderView) {
      participant.renderView = this.generateVideoView(
        ZegoVideoViewType.Remote,
        userID
      );
    }
    this.participantDic.set(userID, participant);
    if (participant.streamID) {
      // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
      this.streamDic.set(participant.streamID, participant);
    } else {
      // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
    }
    this.renderViewHandle(userID);
    return participant.renderView;
  }
  setRoomExtraInfo(key: string, value: string): Promise<boolean> {
    // Currently, only one key-value pair is allowed for room additional messages.
    // The maximum length of key is 10 bytes, and the maximum length of value is 100 bytes.
    return ZegoExpressManager.engine
      .setRoomExtraInfo(this.roomID, key, value)
      .then((result: ZegoServerResponse) => {
        if (result.errorCode === 0) {
          console.warn(
            "[ZEGOCLOUD LOG][Manager][setRoomExtraInfo] - Set success"
          );
        }
        return result.errorCode === 0;
      });
  }
  sendBroadcastMessage(message: string): Promise<boolean> {
    return ZegoExpressManager.engine
      .sendBroadcastMessage(this.roomID, message)
      .then((result: ZegoServerResponse) => {
        if (result.errorCode === 0) {
          console.warn(
            "[ZEGOCLOUD LOG][Manager][sendBroadcastMessage] - Send success"
          );
        }
        return result.errorCode === 0;
      });
  }
  async leaveRoom() {
    console.warn(
      "[ZEGOCLOUD LOG][Manager][leaveRoom] - Stop publishing stream"
    );
    console.warn("[ZEGOCLOUD LOG][Manager][leaveRoom] - Destroy Stream");
    ZegoExpressManager.engine.stopPublishingStream(
      this.localParticipant.streamID
    );
    ZegoExpressManager.engine.destroyStream(
      this.streamMap.get(this.localParticipant.streamID) as MediaStream
    );
    // Inform all audience in the room that the current host has quit
    // Call the interface before leaving the room interface
    this.getRoomRoleByUserID(this.localParticipant.userID) ===
      ZegoUserRole.Host &&
      (await ZegoExpressManager.engine.setRoomExtraInfo(
        this.roomID,
        this.hostLogoutKey,
        "true"
      ));

    this.streamMap.forEach((streamObj, streamID) => {
      console.warn(
        "[ZEGOCLOUD LOG][Manager][leaveRoom] - Stop playing stream",
        streamID
      );
      ZegoExpressManager.engine.stopPlayingStream(streamID);
      (this.streamDic.get(streamID) as ZegoParticipant).renderView &&
        ((
          this.streamDic.get(streamID) as ZegoParticipant
        ).renderView.srcObject = null);
    });
    this.participantDic.clear();
    this.streamDic.clear();
    this.streamMap.clear();
    this.roleMap.clear();
    this.roomID = "";
    this.isPublish = false;
    this.localParticipant.renderView &&
      (this.localParticipant.renderView.srcObject = null);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.localParticipant = {};

    return ZegoExpressManager.engine.logoutRoom();
  }
  onRoomUserUpdate(
    fun: (
      updateType: "DELETE" | "ADD" | "UPDATE",
      userList: ZegoRoomUser[],
      roomID: string
    ) => void
  ) {
    this.roomUserUpdateCallback.push(fun);
    return true;
  }
  onRoomUserDeviceUpdate(
    fun: (
      updateType: ZegoDeviceUpdateType,
      userID: string,
      roomID: string
    ) => void
  ) {
    this.deviceUpdateCallback.push(fun);
    return true;
  }
  onRoomTokenWillExpire(fun: (roomID: string) => void) {
    return ZegoExpressManager.engine.on("tokenWillExpire", fun);
  }
  onRoomExtraInfoUpdate(fun: (roomExtraInfoList: ZegoRoomExtraInfo[]) => void) {
    this.roomExtraInfoCallback.push(fun);
    return true;
  }
  onRoomStateUpdate(
    fun: (state: "DISCONNECTED" | "CONNECTING" | "CONNECTED") => void
  ) {
    return ZegoExpressManager.engine.on(
      "roomStateUpdate",
      (roomID: string, state: "DISCONNECTED" | "CONNECTING" | "CONNECTED") => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][onRoomStateUpdate]",
          roomID,
          state
        );
        fun(state);
      }
    );
  }
  onInvitedJoinLive(fun: () => void) {
    this.invitedLiveJoinCallback.push(fun);
    return true;
  }
  onMuteCohostMicrophone(fun: () => void) {
    this.muteCohostMicrophoneCallback.push(fun);
    return true;
  }
  onMuteCohostCamera(fun: () => void) {
    this.muteCohostCameraCallback.push(fun);
    return true;
  }
  onKickedOutRoom(fun: () => void) {
    this.kickedOutRoomCallback.push(fun);
    return true;
  }
  onBroadcastMessageRecv(
    fun: (msgList: { fromUser: ZegoUser; message: string }[]) => void
  ) {
    ZegoExpressManager.engine.on(
      "IMRecvBroadcastMessage",
      (roomID: string, chatData: ZegoBroadcastMessageInfo[]) => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][onBroadcastMessageRecv]",
          roomID,
          chatData
        );
        const msgList = chatData.map((item) => {
          return { fromUser: item.fromUser, message: item.message };
        });
        fun(msgList);
      }
    );
  }
  private async playStream(stream: ZegoStreamList) {
    if (
      this.mediaOptions.includes(ZegoMediaOptions.AutoPlayAudio) ||
      this.mediaOptions.includes(ZegoMediaOptions.AutoPlayVideo)
    ) {
      console.warn(
        "[ZEGOCLOUD LOG][Manager][playStream] - Start playing stream"
      );
      const playOption = {
        audio: this.mediaOptions.includes(ZegoMediaOptions.AutoPlayAudio),
        video: this.mediaOptions.includes(ZegoMediaOptions.AutoPlayVideo),
      };
      const remoteStream = await ZegoExpressManager.engine.startPlayingStream(
        stream.streamID,
        playOption
      );
      this.streamMap.set(stream.streamID, remoteStream);
      this.renderViewHandle(stream.user.userID);
    }
  }
  private generateStreamID(userID: string, roomID: string): string {
    if (!userID) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][generateStreamID] - UserID is empty, please enter a right userID"
      );
    }
    if (!roomID) {
      console.error(
        "[ZEGOCLOUD LOG][Manager][generateStreamID] - RoomID is empty, please enter a right roomID"
      );
    }

    // The streamID can use any character.
    // For the convenience of query, roomID + UserID + suffix is used here.
    const streamID =
      roomID +
      userID +
      "_main_" +
      (this.getRoomRoleByUserID(userID) === ZegoUserRole.Host ? "host" : "aud");
    return streamID;
  }
  private generateVideoView(
    type: ZegoVideoViewType,
    userID: string
  ): HTMLMediaElement {
    const mediaDom = document.createElement("video");
    mediaDom.id = "zego-video-" + userID;
    mediaDom.autoplay = true;
    mediaDom.playsInline = true;
    if (type === ZegoVideoViewType.Local) {
      mediaDom.muted = true;
    }
    console.warn(
      "[ZEGOCLOUD LOG][Manager][generateVideoView]",
      type,
      userID,
      mediaDom
    );

    return mediaDom;
  }
  private onOtherEvent() {
    ZegoExpressManager.engine.on(
      "roomUserUpdate",
      (roomID: string, updateType: "DELETE" | "ADD", userList: ZegoUser[]) => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][roomUserUpdate]",
          roomID,
          updateType,
          userList
        );
        const userList_: ZegoRoomUser[] = [];
        let role = ZegoUserRole.Audience;
        userList.forEach((user) => {
          if (updateType === "ADD") {
            const participant = this.participantDic.get(user.userID);
            if (participant) {
              // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
              // do not update 'userList_' and call 'add' in 'roomStreamUpdate'
            } else {
              // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
              this.participantDic.set(user.userID, {
                userID: user.userID,
                name: user.userName,
              } as ZegoParticipant);

              this.roleMap.set(user.userID, role);
              userList_.push({ ...user, role });
            }
          } else {
            this.participantDic.delete(user.userID);

            this.roleMap.delete(user.userID);
            role = this.getRoomRoleByUserID(user.userID);
            userList_.push({ ...user, role });
          }
        });
        this.execRoomUserUpdateCallback(updateType, userList_);
      }
    );
    ZegoExpressManager.engine.on(
      "roomStreamUpdate",
      (
        roomID: string,
        updateType: "DELETE" | "ADD",
        streamList: ZegoStreamList[]
      ) => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][roomStreamUpdate]",
          roomID,
          updateType,
          streamList
        );
        const userList_: ZegoRoomUser[] = [];
        let updateType_: "DELETE" | "ADD" | "UPDATE" = "ADD";
        let role = ZegoUserRole.Audience;
        streamList.forEach((stream) => {
          const { streamID, user } = stream;
          const participant = this.participantDic.get(user.userID);
          if (updateType === "ADD") {
            const participant_ = {
              userID: user.userID,
              name: user.userName,
              streamID,
            };
            if (participant) {
              // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
              // or: the same user pushes multiple streams, forget about that for the moment
              participant.streamID = streamID;
              this.participantDic.set(user.userID, participant);
              this.streamDic.set(streamID, participant);

              updateType_ = "UPDATE";
            } else {
              // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
              this.participantDic.set(
                user.userID,
                participant_ as ZegoParticipant
              );
              this.streamDic.set(streamID, participant_ as ZegoParticipant);
            }

            role = this.getRoomRoleByStreamID(streamID);

            this.playStream(stream);
          } else {
            ZegoExpressManager.engine.stopPlayingStream(streamID);
            this.streamMap.delete(streamID);
            this.streamDic.delete(streamID);
            (participant as ZegoParticipant).renderView &&
              ((participant as ZegoParticipant).renderView.srcObject = null);

            updateType_ = "UPDATE";
            role = ZegoUserRole.Audience;
          }
          userList_.push({ ...user, role });
          this.roleMap.set(user.userID, role);
        });
        this.execRoomUserUpdateCallback(updateType_, userList_);
      }
    );
    ZegoExpressManager.engine.on(
      "publishQualityUpdate",
      (streamID: string, stats: ZegoPublishStats) => {
        const participant = this.streamDic.get(streamID);
        if (!participant) return;

        participant.publishAudioQuality = stats.audio.audioQuality;
        participant.publishVideoQuality = stats.video.videoQuality;

        this.streamDic.set(streamID, participant);
        this.participantDic.set(participant.userID, participant);
      }
    );
    ZegoExpressManager.engine.on(
      "playQualityUpdate",
      (streamID: string, stats: ZegoPlayStats) => {
        const participant = this.streamDic.get(streamID);
        if (!participant) return;

        participant.playAudioQuality = stats.audio.audioQuality;
        participant.playVideoQuality = stats.video.videoQuality;

        this.streamDic.set(streamID, participant);
        this.participantDic.set(participant.userID, participant);
      }
    );
    ZegoExpressManager.engine.on(
      "remoteCameraStatusUpdate",
      (streamID: string, status: "OPEN" | "MUTE") => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][remoteCameraStatusUpdate]",
          streamID,
          status
        );
        const participant = this.streamDic.get(streamID);
        if (participant) {
          const updateType =
            status === "OPEN"
              ? ZegoDeviceUpdateType.CameraOpen
              : ZegoDeviceUpdateType.CameraClose;
          participant.camera = status === "OPEN";
          this.streamDic.set(streamID, participant);
          this.participantDic.set(participant.userID, participant);
          this.deviceUpdateCallback.forEach((fun) => {
            fun(updateType, participant.userID, this.roomID);
          });
        }
      }
    );
    ZegoExpressManager.engine.on(
      "remoteMicStatusUpdate",
      (streamID: string, status: "OPEN" | "MUTE") => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][remoteMicStatusUpdate]",
          streamID,
          status
        );
        const participant = this.streamDic.get(streamID);
        if (participant) {
          const updateType =
            status === "OPEN"
              ? ZegoDeviceUpdateType.MicUnmute
              : ZegoDeviceUpdateType.MicMute;
          participant.mic = status === "OPEN";
          this.streamDic.set(streamID, participant);
          this.participantDic.set(participant.userID, participant);
          this.deviceUpdateCallback.forEach((fun) => {
            fun(updateType, participant.userID, this.roomID);
          });
        }
      }
    );
    ZegoExpressManager.engine.on(
      "IMRecvCustomCommand",
      (roomID: string, fromUser: ZegoUser, command: string) => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][IMRecvCustomCommand]",
          roomID,
          fromUser,
          command
        );
        if (command === this.muteMicKey) {
          this.execMuteCohostMicrophoneCallback();
        } else if (command === this.muteCameraKey) {
          this.execMuteCohostCameraCallback();
        } else if (command === this.inviteKey) {
          this.execInvitedLiveJoinCallback();
        }
      }
    );
    ZegoExpressManager.engine.on(
      "roomExtraInfoUpdate",
      (roomID: string, roomExtraInfoList: ZegoRoomExtraInfo[]) => {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][roomExtraInfoUpdate]",
          roomID,
          roomExtraInfoList
        );
        this.execRoomExtraInfoCallback(roomExtraInfoList);
      }
    );
  }
  private renderViewHandle(userID: string) {
    const participant = this.participantDic.get(userID);
    if (participant && participant.streamID && participant.renderView) {
      console.warn(
        "[ZEGOCLOUD LOG][Manager][renderViewHandle] - Start render view"
      );
      const streamObj = this.streamMap.get(participant.streamID);
      participant.renderView.srcObject = streamObj as MediaStream;
    }
  }
  private transFlutterData<T>(data: T | string): T | string {
    return typeof data === "string" ? JSON.parse(data) : data;
  }
  private triggerStreamHandle(type: "camera" | "mic", enable: boolean) {
    const { streamID, camera, mic } = this.localParticipant;
    const streamObj = this.streamMap.get(streamID) as MediaStream;
    if (enable) {
      if (!this.isPublish) {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][triggerStreamHandle] - Start publishing stream"
        );
        this.isPublish = true;
        ZegoExpressManager.engine.startPublishingStream(streamID, streamObj);
        this.triggerPreview("start");
      }
    } else {
      if (
        ((type === "camera" && !mic) || (type === "mic" && !camera)) &&
        !this.mediaOptions.includes(ZegoMediaOptions.PublishLocalAudio) &&
        !this.mediaOptions.includes(ZegoMediaOptions.PublishLocalVideo)
      ) {
        console.warn(
          "[ZEGOCLOUD LOG][Manager][triggerStreamHandle] - Stop publishing stream"
        );
        this.isPublish = false;
        ZegoExpressManager.engine.stopPublishingStream(streamID);
        // The stream is not deleted here and it is deleted on departure
        this.triggerPreview("stop");
      }
    }
  }
  private triggerPreview(type: "start" | "stop") {
    if (this.localParticipant.renderView) {
      if (type === "stop") {
        // Stop preview
        console.warn(
          "[ZEGOCLOUD LOG][Manager][triggerPreview] - Stop preview",
          this.localParticipant.streamID
        );
        this.localParticipant.renderView.srcObject = null;
      } else {
        // Start preview
        console.warn(
          "[ZEGOCLOUD LOG][Manager][triggerPreview] - Start preview",
          this.localParticipant.streamID
        );
        const streamID = this.localParticipant.streamID;
        const streamObj = this.streamMap.get(streamID) as MediaStream;
        this.localParticipant.renderView.srcObject = streamObj;
      }
    }
  }
  private execRoomUserUpdateCallback(
    updateType: "DELETE" | "ADD" | "UPDATE",
    userList: ZegoRoomUser[]
  ) {
    if (!userList.length) return;
    console.warn(
      "[ZEGOCLOUD LOG][Manager][execRoomUserUpdateCallback]",
      updateType,
      userList
    );
    this.roomUserUpdateCallback.forEach((fun) => {
      fun(updateType, userList, this.roomID);
    });
  }
  private execMuteCohostMicrophoneCallback() {
    console.warn("[ZEGOCLOUD LOG][Manager][execMuteCohostMicrophoneCallback]");
    setTimeout(() => {
      this.enableMic(false);
    }, 0);
    this.muteCohostMicrophoneCallback.forEach((fun) => {
      fun();
    });
  }
  private execMuteCohostCameraCallback() {
    console.warn("[ZEGOCLOUD LOG][Manager][execMuteCohostCameraCallback]");
    setTimeout(() => {
      this.enableCamera(false);
    }, 0);
    this.muteCohostCameraCallback.forEach((fun) => {
      fun();
    });
  }
  private execInvitedLiveJoinCallback() {
    console.warn("[ZEGOCLOUD LOG][Manager][execInvitedLiveJoinCallback]");
    this.invitedLiveJoinCallback.forEach((fun) => {
      fun();
    });
  }
  private execRoomExtraInfoCallback(roomExtraInfoList: ZegoRoomExtraInfo[]) {
    const roomExtraInfoList_: ZegoRoomExtraInfo[] = [];
    let kickedOut = false;
    roomExtraInfoList.forEach((roomExtraInfo) => {
      if (roomExtraInfo.key !== this.hostLogoutKey) {
        roomExtraInfoList_.push(roomExtraInfo);
      } else {
        roomExtraInfo.value === "true" && (kickedOut = true);
      }
    });
    if (roomExtraInfoList_.length) {
      console.warn("[ZEGOCLOUD LOG][Manager][execRoomExtraInfoCallback");
      this.roomExtraInfoCallback.forEach((fun) => {
        fun(roomExtraInfoList_);
      });
    }
    kickedOut && this.execKickedOutRoomCallback();
  }
  private execKickedOutRoomCallback() {
    console.warn("[ZEGOCLOUD LOG][Manager][execKickedOutRoomCallback");
    this.leaveRoom();
    this.kickedOutRoomCallback.forEach((fun) => {
      fun();
    });
  }
  private getRoomRoleByStreamID(streamID: string): ZegoUserRole {
    return streamID.includes("_host") ? ZegoUserRole.Host : ZegoUserRole.CoHost;
  }
  private getRoomRoleByUserID(userID: string): ZegoUserRole {
    const role = this.roleMap.get(userID);
    if (role === undefined) this.roleMap.set(userID, ZegoUserRole.Audience);
    return this.roleMap.get(userID) as ZegoUserRole;
  }
  private createStream() {
    const source = {
      camera: {
        audio: true,
        video: true,
        facingMode: "user" as "user" | "environment",
      },
    };
    return ZegoExpressManager.engine.createStream(source).then((streamObj) => {
      console.warn("[ZEGOCLOUD LOG][Manager][createStream] - Create success");
      return streamObj;
    });
  }
}
