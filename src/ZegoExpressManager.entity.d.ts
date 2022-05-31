export declare enum ZegoMediaOptions {
    AutoPlayAudio = 1,
    AutoPlayVideo = 2,
    PublishLocalAudio = 4,
    PublishLocalVideo = 8
}
export declare enum ZegoDeviceUpdateType {
    CameraOpen = 0,
    CameraClose = 1,
    MicUnmute = 2,
    MicMute = 3
}
export declare enum ZegoStreamQualityLevel {
    Unknown = -1,
    Excellent = 0,
    Good = 1,
    Medium = 2,
    Bad = 3,
    Die = 4
}
export interface ZegoUser {
    userID: string;
    userName?: string;
}
export interface ZegoRoomConfig {
    userUpdate: boolean;
    maxMemberCount: number;
}
export interface ZegoParticipant {
    userID: string;
    name?: string;
    streamID: string;
    renderView: HTMLMediaElement;
    camera: boolean;
    mic: boolean;
    playVideoQuality: ZegoStreamQualityLevel;
    playAudioQuality: ZegoStreamQualityLevel;
    publishVideoQuality: ZegoStreamQualityLevel;
    publishAudioQuality: ZegoStreamQualityLevel;
}
export declare enum ZegoVideoViewType {
    Local = 0,
    Remote = 1
}
