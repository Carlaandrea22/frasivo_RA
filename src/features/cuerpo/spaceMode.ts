export function chooseSpaceMode(device: { ios: boolean; android: boolean; webxr: boolean }) {
  if (device.ios) return 'camera';
  if (device.android && device.webxr) return 'webxr';
  return 'viewer';
}
