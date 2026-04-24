// 设备接口定义
export interface Device {
  name: string;
  status: 'connected' | 'disconnected';
  RSSI: number;
  advertisData: ArrayBuffer;
  advertisServiceUUIDs: string[];
  deviceId: string;
  localName: string;
  serviceData: TaroGeneral.IAnyObject;
  connectable: boolean;
}