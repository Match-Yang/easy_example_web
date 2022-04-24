export enum ZegoMediaOptions {
  AutoPlayAudio = 1,
  AutoPlayVideo = 2,
  PublishLocalAudio = 4,
  PublishLocalVideo = 8,
}

export enum ZegoDeviceUpdateType {
  CameraOpen,
  CameraClose,
  MicUnmute,
  MicMute,
}

export enum ZegoStreamQualityLevel {
  Unknown = -1,
  Excellent = 0,
  Good,
  Medium,
  Bad,
  Die,
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

export enum ZegoVideoViewType {
  Local = 0,
  Remote = 1,
}
