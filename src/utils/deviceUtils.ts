import Taro, { getStorageSync } from '@tarojs/taro';
import { Device } from '../../types/device';

// 获取连接设备的函数
export const getConnectedDevice = (): Device | null => {
  const device = getStorageSync('connectedDevice') as Device | undefined;
  return device || null;
};

// 保存连接设备的函数
export const saveConnectedDevice = (device: Device): void => {
  Taro.setStorageSync('connectedDevice', device);
};

// 清除连接设备的函数
export const clearConnectedDevice = (): void => {
  Taro.removeStorageSync('connectedDevice');
};

// ArrayBuffer转16进制字符串
export const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
    return ("00" + bit.toString(16)).slice(-2);
  });
  return hexArr.join("");
};