"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ZegoExpressManager = void 0;
var zego_express_engine_webrtc_1 = require("zego-express-engine-webrtc");
var ZegoExpressManager_entity_1 = require("./ZegoExpressManager.entity");
var ZegoExpressManager = /** @class */ (function () {
    function ZegoExpressManager() {
        // key is UserID, value is participant model
        this.participantDic = new Map();
        // key is streamID, value is participant model
        this.streamDic = new Map();
        this.roomID = "";
        this.streamMap = new Map();
        this.mediaOptions = [
            ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayAudio,
            ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayVideo,
            ZegoExpressManager_entity_1.ZegoMediaOptions.PublishLocalAudio,
            ZegoExpressManager_entity_1.ZegoMediaOptions.PublishLocalVideo,
        ];
        this.deviceUpdateCallback = [];
        this.publishState = ZegoExpressManager_entity_1.ZegoPublishState.None;
        if (!ZegoExpressManager.shared) {
            this.localParticipant = {};
            ZegoExpressManager.shared = this;
        }
        return ZegoExpressManager.shared;
    }
    ZegoExpressManager.getEngine = function () {
        return ZegoExpressManager.engine;
    };
    ZegoExpressManager.prototype.createEngine = function (appID, server) {
        if (!ZegoExpressManager.engine) {
            ZegoExpressManager.engine = new zego_express_engine_webrtc_1.ZegoExpressEngine(appID, server);
            this.onOtherEvent();
        }
    };
    ZegoExpressManager.prototype.checkWebRTC = function () {
        return ZegoExpressManager.engine
            .checkSystemRequirements("webRTC")
            .then(function (result) {
            return !!result.webRTC;
        });
    };
    ZegoExpressManager.prototype.checkCamera = function () {
        return ZegoExpressManager.engine
            .checkSystemRequirements("camera")
            .then(function (result) {
            return !!result.camera;
        });
    };
    ZegoExpressManager.prototype.checkMicrophone = function () {
        return ZegoExpressManager.engine
            .checkSystemRequirements("microphone")
            .then(function (result) {
            return !!result.microphone;
        });
    };
    ZegoExpressManager.prototype.joinRoom = function (roomID, token, user, options) {
        var _this = this;
        if (!token) {
            console.error("Error: [joinRoom] token is empty, please enter a right token");
            return Promise.resolve(false);
        }
        this.roomID = roomID;
        if (options) {
            options = this.transFlutterData(options);
            this.mediaOptions = options.map(function (e) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return typeof e === "object" ? e.index : e;
            });
        }
        user = this.transFlutterData(user);
        this.localParticipant.userID = user.userID;
        this.localParticipant.name = user.userName;
        this.localParticipant.streamID = this.generateStreamID(user.userID, roomID);
        this.participantDic.set(this.localParticipant.userID, this.localParticipant);
        this.streamDic.set(this.localParticipant.streamID, this.localParticipant);
        var config = {
            userUpdate: true,
            maxMemberCount: 0
        };
        return ZegoExpressManager.engine
            .loginRoom(roomID, token, user, config)
            .then(function (result) { return __awaiter(_this, void 0, void 0, function () {
            var source, localStream, result_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!result) return [3 /*break*/, 2];
                        this.localParticipant.camera = this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.PublishLocalVideo);
                        this.localParticipant.mic = this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.PublishLocalAudio);
                        if (!(this.localParticipant.camera || this.localParticipant.mic)) return [3 /*break*/, 2];
                        source = {
                            camera: {
                                audio: this.localParticipant.mic,
                                video: this.localParticipant.camera,
                                facingMode: "user"
                            }
                        };
                        return [4 /*yield*/, ZegoExpressManager.engine.createStream(source)];
                    case 1:
                        localStream = _a.sent();
                        this.streamMap.set(this.localParticipant.streamID, localStream);
                        // Determine if srcObject has been updated
                        if (this.localParticipant.renderView &&
                            !this.localParticipant.renderView.srcObject) {
                            this.localParticipant.renderView.srcObject = localStream;
                        }
                        result_1 = ZegoExpressManager.engine.startPublishingStream(this.localParticipant.streamID, localStream);
                        if (result_1) {
                            this.publishState =
                                this.localParticipant.camera && this.localParticipant.mic
                                    ? ZegoExpressManager_entity_1.ZegoPublishState.All
                                    : this.localParticipant.camera
                                        ? ZegoExpressManager_entity_1.ZegoPublishState.Video
                                        : this.localParticipant.mic
                                            ? ZegoExpressManager_entity_1.ZegoPublishState.Audio
                                            : ZegoExpressManager_entity_1.ZegoPublishState.None;
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, result];
                }
            });
        }); });
    };
    ZegoExpressManager.prototype.enableCamera = function (enable) {
        var streamID = this.localParticipant.streamID;
        var streamObj = this.streamMap.get(streamID);
        var result = ZegoExpressManager.engine.mutePublishStreamVideo(streamObj, !enable);
        if (result) {
            this.localParticipant.camera = enable;
            this.triggerStreamHandle(enable);
        }
        return result;
    };
    ZegoExpressManager.prototype.enableMic = function (enable) {
        var streamID = this.localParticipant.streamID;
        var streamObj = this.streamMap.get(streamID);
        var result = ZegoExpressManager.engine.mutePublishStreamAudio(streamObj, !enable);
        if (result) {
            this.localParticipant.mic = enable;
            this.triggerStreamHandle(enable);
        }
        return result;
    };
    ZegoExpressManager.prototype.getLocalVideoView = function () {
        if (!this.roomID) {
            console.error("Error: [getVideoView] You need to join the room first and then set the videoView");
        }
        var _a = this.localParticipant, streamID = _a.streamID, userID = _a.userID;
        var renderView = this.generateVideoView(ZegoExpressManager_entity_1.ZegoVideoViewType.Local, userID);
        var streamObj = this.streamMap.get(streamID);
        if (streamObj) {
            // Render now
            renderView.srcObject = streamObj;
        }
        else {
            // Delay rendering until stream is created successfully
        }
        this.localParticipant.renderView = renderView;
        this.participantDic.set(userID, this.localParticipant);
        this.streamDic.set(streamID, this.localParticipant);
        return renderView;
    };
    ZegoExpressManager.prototype.getRemoteVideoView = function (userID) {
        if (!this.roomID) {
            console.error("Error: [getVideoView] You need to join the room first and then set the videoView");
        }
        if (!userID) {
            console.error("Error: [getVideoView] userID is empty, please enter a right userID");
        }
        var renderView = this.generateVideoView(ZegoExpressManager_entity_1.ZegoVideoViewType.Local, userID);
        var participant = this.participantDic.get(userID);
        participant.renderView = renderView;
        this.participantDic.set(userID, participant);
        if (participant.streamID) {
            // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
            this.streamDic.set(participant.streamID, participant);
        }
        else {
            // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
        }
        this.renderViewHandle(userID);
        return renderView;
    };
    ZegoExpressManager.prototype.setRoomExtraInfo = function (key, value) {
        return ZegoExpressManager.engine
            .setRoomExtraInfo(this.roomID, key, value)
            .then(function (result) {
            return result.errorCode === 0;
        });
    };
    ZegoExpressManager.prototype.leaveRoom = function () {
        var _this = this;
        ZegoExpressManager.engine.stopPublishingStream(this.localParticipant.streamID);
        ZegoExpressManager.engine.destroyStream(this.streamMap.get(this.localParticipant.streamID));
        this.streamMap.forEach(function (streamObj, streamID) {
            ZegoExpressManager.engine.stopPlayingStream(streamID);
            _this.streamDic.get(streamID).renderView &&
                (_this.streamDic.get(streamID).renderView.srcObject = null);
        });
        this.participantDic.clear();
        this.streamDic.clear();
        this.streamMap.clear();
        this.roomID = "";
        this.localParticipant.renderView &&
            (this.localParticipant.renderView.srcObject = null);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.localParticipant = {};
        return ZegoExpressManager.engine.logoutRoom();
    };
    ZegoExpressManager.prototype.onRoomUserUpdate = function (fun) {
        return ZegoExpressManager.engine.on("roomUserUpdate", function (roomID, updateType, userList) {
            var userIDList = [];
            userList.forEach(function (user) {
                userIDList.push(user.userID);
            });
            fun(updateType, userIDList, roomID);
        });
    };
    ZegoExpressManager.prototype.onRoomUserDeviceUpdate = function (fun) {
        this.deviceUpdateCallback.push(fun);
        return true;
    };
    ZegoExpressManager.prototype.onRoomTokenWillExpire = function (fun) {
        return ZegoExpressManager.engine.on("tokenWillExpire", fun);
    };
    ZegoExpressManager.prototype.onRoomExtraInfoUpdate = function (fun) {
        return ZegoExpressManager.engine.on("roomExtraInfoUpdate", function (roomID, roomExtraInfoList) {
            fun(roomExtraInfoList);
        });
    };
    ZegoExpressManager.prototype.onRoomStateUpdate = function (fun) {
        return ZegoExpressManager.engine.on("roomStateUpdate", function (roomID, state) {
            fun(state);
        });
    };
    ZegoExpressManager.prototype.playStream = function (stream) {
        return __awaiter(this, void 0, void 0, function () {
            var playOption, remoteStream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayAudio) ||
                            this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayVideo))) return [3 /*break*/, 2];
                        playOption = {
                            audio: this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayAudio),
                            video: this.mediaOptions.includes(ZegoExpressManager_entity_1.ZegoMediaOptions.AutoPlayVideo)
                        };
                        return [4 /*yield*/, ZegoExpressManager.engine.startPlayingStream(stream.streamID, playOption)];
                    case 1:
                        remoteStream = _a.sent();
                        this.streamMap.set(stream.streamID, remoteStream);
                        this.renderViewHandle(stream.user.userID);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    ZegoExpressManager.prototype.generateStreamID = function (userID, roomID) {
        if (!userID) {
            console.error("Error: [generateStreamID] userID is empty, please enter a right userID");
        }
        if (!roomID) {
            console.error("Error: [generateStreamID] roomID is empty, please enter a right roomID");
        }
        // The streamID can use any character.
        // For the convenience of query, roomID + UserID + suffix is used here.
        var streamID = roomID + userID + "_main";
        return streamID;
    };
    ZegoExpressManager.prototype.generateVideoView = function (type, userID) {
        var mediaDom = document.createElement("video");
        mediaDom.id = "zego-video-" + userID;
        mediaDom.autoplay = true;
        if (type === ZegoExpressManager_entity_1.ZegoVideoViewType.Local) {
            mediaDom.muted = true;
        }
        return mediaDom;
    };
    ZegoExpressManager.prototype.onOtherEvent = function () {
        var _this = this;
        ZegoExpressManager.engine.on("roomUserUpdate", function (roomID, updateType, userList) {
            userList.forEach(function (user) {
                if (updateType === "ADD") {
                    var participant = _this.participantDic.get(user.userID);
                    if (participant) {
                        // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
                    }
                    else {
                        // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
                        _this.participantDic.set(user.userID, {
                            userID: user.userID,
                            name: user.userName
                        });
                    }
                }
                else {
                    _this.participantDic["delete"](user.userID);
                }
            });
        });
        ZegoExpressManager.engine.on("roomStreamUpdate", function (roomID, updateType, streamList) {
            streamList.forEach(function (stream) {
                var participant = _this.participantDic.get(stream.user.userID);
                if (updateType === "ADD") {
                    var participant_ = {
                        userID: stream.user.userID,
                        name: stream.user.userName,
                        streamID: stream.streamID
                    };
                    if (participant) {
                        // inner roomUserUpdate -> out roomUserUpdate -> inner roomStreamUpdate
                        participant.streamID = stream.streamID;
                        _this.participantDic.set(stream.user.userID, participant);
                        _this.streamDic.set(stream.streamID, participant);
                    }
                    else {
                        // inner roomStreamUpdate -> inner roomUserUpdate -> out roomUserUpdate
                        _this.participantDic.set(stream.user.userID, participant_);
                        _this.streamDic.set(stream.streamID, participant_);
                    }
                    _this.playStream(stream);
                }
                else {
                    ZegoExpressManager.engine.stopPlayingStream(stream.streamID);
                    _this.streamMap["delete"](stream.streamID);
                    _this.streamDic["delete"](stream.streamID);
                    participant.renderView &&
                        (participant.renderView.srcObject = null);
                }
            });
        });
        ZegoExpressManager.engine.on("publishQualityUpdate", function (streamID, stats) {
            // console.error("inner publishQualityUpdate");
            var participant = _this.streamDic.get(streamID);
            if (!participant)
                return;
            participant.publishAudioQuality = stats.audio.audioQuality;
            participant.publishVideoQuality = stats.video.videoQuality;
            _this.streamDic.set(streamID, participant);
            _this.participantDic.set(participant.userID, participant);
        });
        ZegoExpressManager.engine.on("playQualityUpdate", function (streamID, stats) {
            // console.error("inner playQualityUpdate");
            var participant = _this.streamDic.get(streamID);
            if (!participant)
                return;
            participant.playAudioQuality = stats.audio.audioQuality;
            participant.playVideoQuality = stats.video.videoQuality;
            _this.streamDic.set(streamID, participant);
            _this.participantDic.set(participant.userID, participant);
        });
        ZegoExpressManager.engine.on("remoteCameraStatusUpdate", function (streamID, status) {
            var participant = _this.streamDic.get(streamID);
            if (participant) {
                var updateType_1 = status === "OPEN"
                    ? ZegoExpressManager_entity_1.ZegoDeviceUpdateType.CameraOpen
                    : ZegoExpressManager_entity_1.ZegoDeviceUpdateType.CameraClose;
                participant.camera = status === "OPEN";
                _this.streamDic.set(streamID, participant);
                _this.participantDic.set(participant.userID, participant);
                _this.deviceUpdateCallback.forEach(function (fun) {
                    fun(updateType_1, participant.userID, _this.roomID);
                });
            }
        });
        ZegoExpressManager.engine.on("remoteMicStatusUpdate", function (streamID, status) {
            var participant = _this.streamDic.get(streamID);
            if (participant) {
                var updateType_2 = status === "OPEN"
                    ? ZegoExpressManager_entity_1.ZegoDeviceUpdateType.MicUnmute
                    : ZegoExpressManager_entity_1.ZegoDeviceUpdateType.MicMute;
                participant.mic = status === "OPEN";
                _this.streamDic.set(streamID, participant);
                _this.participantDic.set(participant.userID, participant);
                _this.deviceUpdateCallback.forEach(function (fun) {
                    fun(updateType_2, participant.userID, _this.roomID);
                });
            }
        });
    };
    ZegoExpressManager.prototype.renderViewHandle = function (userID) {
        var participant = this.participantDic.get(userID);
        if (participant && participant.streamID && participant.renderView) {
            var streamObj = this.streamMap.get(participant.streamID);
            participant.renderView.srcObject = streamObj;
        }
    };
    ZegoExpressManager.prototype.transFlutterData = function (data) {
        return typeof data === "string" ? JSON.parse(data) : data;
    };
    ZegoExpressManager.prototype.triggerStreamHandle = function (enable) {
        var streamID = this.localParticipant.streamID;
        var streamObj = this.streamMap.get(streamID);
        if (enable) {
            if (ZegoExpressManager_entity_1.ZegoPublishState.None) {
                ZegoExpressManager.engine.startPublishingStream(streamID, streamObj);
            }
        }
        else {
        }
    };
    ZegoExpressManager.shared = new ZegoExpressManager();
    return ZegoExpressManager;
}());
exports.ZegoExpressManager = ZegoExpressManager;
