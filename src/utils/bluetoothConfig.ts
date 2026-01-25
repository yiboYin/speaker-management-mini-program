// 蓝牙配置和全局状态管理

// 主 service 的 uuid 列表
let serviceUUID: string[] = [];

// 写入 UUID
let writeUUID: string = "";

// notify UUID
let notifyUUID: string = "";

// 过滤获取到的服务uuid
let filterServiceUUID: string = "";

// 设备名称
let filterDeviceName: string = "";

// 用于区分设备的 id
let deviceId: string = '';

// 导出获取函数
export const getBluetoothConfig = () => ({
  serviceUUID: [...serviceUUID],
  writeUUID,
  notifyUUID,
  filterServiceUUID,
  filterDeviceName,
  deviceId
});

// 导出设置函数
export const setBluetoothConfig = (config: Partial<{
  serviceUUID: string[],
  writeUUID: string,
  notifyUUID: string,
  filterServiceUUID: string,
  filterDeviceName: string,
  deviceId: string
}>) => {
  if (config.serviceUUID !== undefined) serviceUUID = [...config.serviceUUID];
  if (config.writeUUID !== undefined) writeUUID = config.writeUUID;
  if (config.notifyUUID !== undefined) notifyUUID = config.notifyUUID;
  if (config.filterServiceUUID !== undefined) filterServiceUUID = config.filterServiceUUID;
  if (config.filterDeviceName !== undefined) filterDeviceName = config.filterDeviceName;
  if (config.deviceId !== undefined) deviceId = config.deviceId;
};

// 导出重置函数
export const resetBluetoothConfig = () => {
  serviceUUID = [];
  writeUUID = "";
  notifyUUID = "";
  filterServiceUUID = "";
  filterDeviceName = "";
  deviceId = '';
};

// 导出单独的getter和setter函数
export const getServiceUUID = (): string[] => [...serviceUUID];
export const setServiceUUID = (uuids: string[]) => { serviceUUID = [...uuids]; };

export const getWriteUUID = (): string => writeUUID;
export const setWriteUUID = (uuid: string) => { writeUUID = uuid; };

export const getNotifyUUID = (): string => notifyUUID;
export const setNotifyUUID = (uuid: string) => { notifyUUID = uuid; };

export const getFilterServiceUUID = (): string => filterServiceUUID;
export const setFilterServiceUUID = (uuid: string) => { filterServiceUUID = uuid; };

export const getFilterDeviceName = (): string => filterDeviceName;
export const setFilterDeviceName = (name: string) => { filterDeviceName = name; };

export const getDeviceId = (): string => deviceId;
export const setDeviceId = (id: string) => { deviceId = id; };