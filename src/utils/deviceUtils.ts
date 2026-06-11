import Taro, { getStorageSync } from '@tarojs/taro';
import { Device } from '../types/device';

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
export const ab2hex = (buffer: ArrayBuffer): string => {
  const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
    return ("00" + bit.toString(16)).slice(-2);
  });
  return hexArr.join("");
};

// 16进制转10进制相加取低字节
export const hexToDec = (hex: number[]): string => {
  let plusNum = 0;
  for (let i = 0; i < hex.length; i++) {
    plusNum += hex[i];
  }
  const hexStr = plusNum.toString(16);
  const s = "00" + hexStr;
  return s.substr(s.length - 2, 2); // 截取最后2位字符
};

// 十六进制转十进制数组
export const hexToDecimalism = (hexStr: string): number[] => {
  const trimedStr = hexStr.trim();
  const rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
  const len = rawStr.length;
  if (len % 2 !== 0) {
    console.log("存在非法字符!");
    return [];
  }
  const resultStr: number[] = [];
  for (let i = 0; i < len; i = i + 2) {
    const curCharCode = parseInt(rawStr.substr(i, 2), 16);
    resultStr.push(curCharCode);
  }
  return resultStr;
};

// 16进制转ASCII字符串
export const hexCharCodeToStr = (hexStr: string): string => {
  const trimedStr = hexStr.trim();
  const rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
  const len = rawStr.length;
  if (len % 2 !== 0) {
    console.log("存在非法字符!");
    return "";
  }
  const resultStr: string[] = [];
  for (let i = 0; i < len; i = i + 2) {
    const curCharCode = parseInt(rawStr.substr(i, 2), 16);
    resultStr.push(String.fromCharCode(curCharCode));
  }
  return resultStr.join("");
};

// 16进制数组转ASCII字符串
export const hexArrToCharCode = (hexArr: number[]): string => {
  const resultStr: string[] = [];
  for (let i = 0; i < hexArr.length; i++) {
    resultStr.push(String.fromCharCode(hexArr[i]));
  }
  return resultStr.join("");
};

// ASCII码转16进制
export const strToHexCharCode = (str: string): string => {
  if (str === "") {
    return "";
  } else {
    const hexCharCode: string[] = [];
    for (let i = 0; i < str.length; i++) {
      hexCharCode.push(str.charCodeAt(i).toString(16));
    }
    return "0x" + hexCharCode.join("");
  }
};

// 前面自动补零
export const prefixZero = (num: number, n: number): string => {
  return (Array(n).join("0") + num).slice(-n);
};

// 数组值相加
export const arrSum = (arr: number[]): number => {
  return arr.reduce((sum, val) => sum + val, 0);
};

// 将十六进制字符串转换为ArrayBuffer
export const hexStringToArrayBuffer = (hexString: string): ArrayBuffer => {
  // 移除空格并按空格分割十六进制字符串
  const hexValues = hexString.replace(/\s+/g, ' ').trim().split(' ');
  
  // 创建字节数组
  const bytes = new Uint8Array(hexValues.length);
  
  // 将每个十六进制值转换为字节
  hexValues.forEach((hex, index) => {
    bytes[index] = parseInt(hex, 16);
  });
  
  // 返回ArrayBuffer
  return bytes.buffer;
};


// 注意：此函数需要在有设备信息的上下文中调用，需要手动传入设备信息以避免循环依赖
// 回调函数返回 true 表示继续监听，返回 false 表示终止监听
export const listenToDeviceData = (onDataReceived: (data: {
  hex: string;
  ascii: string;
  rawValue: ArrayBuffer;
  result: any;
  deviceId: string;
  serviceUUID: string;
  notifyUUID: string;
  resValue: Uint8Array;
}) => boolean | void, deviceId: string, serviceUUID: string, notifyUUID: string) => {
  if (!deviceId) {
    console.error('未找到已连接的设备ID');
    return;
  }
  
  if (!serviceUUID) {
    console.error('未找到服务UUID');
    return;
  }
  
  if (!notifyUUID) {
    console.error('未找到通知特征UUID');
    return;
  }
  
  // 定义特征值变化的回调函数
  const handleCharacteristicValueChange = (result: any) => {
    console.log('特征值变化:', result);
    // 处理从设备接收到的数据
    if (result.deviceId === deviceId && result.serviceId === serviceUUID && result.characteristicId === notifyUUID) {
      console.log('收到设备数据:', result.value);
      
      // 将数据转换为十六进制和ASCII
      let hex = ab2hex(result.value).toUpperCase();
      console.log('十六进制:', hex);
      
      // 将十六进制转换为ASCII字符串
      const asciiStr = hexCharCodeToStr(hex);
      console.log('ASCII字符串:', asciiStr);

      const resValue = new Uint8Array(result.value, 0)
      console.log('Uint8Array:', resValue)
      let temp = '';
      temp = String.fromCharCode.apply(String, resValue);
      console.log('temp --- ASCII字符串:', temp);
      
      // 调用回调函数处理接收到的数据，并获取返回值
      const shouldContinue = onDataReceived({
        hex,
        ascii: asciiStr,
        rawValue: result.value,
        result,
        deviceId,
        serviceUUID,
        notifyUUID,
        resValue
      });
      
      // 根据回调函数返回值决定是否终止监听
      // 如果返回 false，则取消监听；返回 true 或 undefined 则继续监听
      if (shouldContinue === false) {
        console.log('回调函数返回 false，取消监听');
        Taro.offBLECharacteristicValueChange(handleCharacteristicValueChange);
      }
    }
  };
  
  // 监听特征值变化
  Taro.onBLECharacteristicValueChange(handleCharacteristicValueChange);
};

// 发送指令到设备的辅助函数
export const sendCommandToDevice = async (
  command: string, 
  onDataReceived?: (data: any) => void,
  deviceId?: string, 
  serviceUUID?: string, 
  writeUUID?: string, 
  notifyUUID?: string
) => {
  // 首先检查是否已连接设备
  const { getConnectedDevice } = await import('@/utils/deviceUtils');
  const device = getConnectedDevice();
  if (!device) {
    // 未连接设备，提示用户
    console.log('请先连接设备');
    return;
  }
  
  // 如果没有提供设备信息，则从全局配置获取
  const bluetoothConfig = await import('@/utils/bluetoothConfig');
  const actualDeviceId = deviceId || bluetoothConfig.getDeviceId();
  const actualServiceUUID = serviceUUID || bluetoothConfig.getFilterServiceUUID();
  const actualWriteUUID = writeUUID || bluetoothConfig.getWriteUUID();
  
  try {
    if (actualDeviceId && actualServiceUUID && actualWriteUUID) {
      if (onDataReceived) {
        const actualNotifyUUID = notifyUUID || bluetoothConfig.getNotifyUUID();
        
        if (actualNotifyUUID) {
          // 启动监听
          listenToDeviceData(
            onDataReceived, 
            actualDeviceId, 
            actualServiceUUID, 
            actualNotifyUUID
          );
        } else {
          console.error('通知特征UUID未找到，无法启动监听');
        }
      }
      // 执行写入操作
      writeCommandToDevice(command, actualDeviceId, actualServiceUUID, actualWriteUUID);
    } else {
      console.error('设备信息不完整，无法发送指令');
      throw new Error('设备信息不完整');
    }
  } catch (error) {
    console.error('发送指令失败:', error);
    // 显示失败提示
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    Taro.showToast({
      title: `发送失败: ${errorMessage}`,
      icon: 'none',
      duration: 2000
    });
  }
};

// 写入数据到蓝牙设备的辅助函数
export const writeCommandToDevice = async (command: string, deviceId: string, serviceUUID: string, writeUUID: string): Promise<boolean> => {
  // 如果命令长度超过20字节，则使用分包发送
  const buffer = hexStringToArrayBuffer(command);
  if (buffer.byteLength > 20) {
    return writeCommandToDeviceWithSplit(buffer, deviceId, serviceUUID, writeUUID);
  }
  
  // 否则使用原方法发送

  if (!deviceId) {
    throw new Error('未找到已连接的设备ID');
  }
  
  if (!serviceUUID) {
    throw new Error('未找到服务UUID');
  }
  
  if (!writeUUID) {
    throw new Error('未找到写特征UUID');
  }
  
  try {
    // 将指令转换为ArrayBuffer
    // const buffer = hexStringToArrayBuffer(command);
    console.log('将指令转换为ArrayBuffer:', buffer);
    // 将十六进制转换为ASCII字符串
    let tempHexStr = ab2hex(buffer).toUpperCase();
    console.log('start hex --- ', tempHexStr);
    const asciiStr1 = hexCharCodeToStr(tempHexStr);
    console.log('start ASCIICode ---- :', asciiStr1);

    let startValue = new Uint8Array(buffer, 0)
    console.log('start Uint8Array: --- ', startValue)
    let temp = '';
    temp = String.fromCharCode.apply(String, startValue);
    console.log('start --- ASCII字符串:', temp);
    
    // 向特征值写入数据
    await Taro.writeBLECharacteristicValue({
      deviceId,
      serviceId: serviceUUID,
      characteristicId: writeUUID,
      value: buffer,
    });
    
    console.log(`成功向特征值写入数据: ${command}`);
    
    return true;
  } catch (error) {
    console.error('写入特征值失败:', error);
    return false;
  }
};

// 分包发送大于20字节的数据（带应答确认机制）
// 每个数据包发送后等待设备应答，确认成功后才发送下一个包
export const writeCommandToDeviceWithSplit = async (
  buffer: ArrayBuffer, 
  deviceId: string, 
  serviceUUID: string, 
  writeUUID: string,
  notifyUUID: string,      // 新增：用于监听设备应答的特征UUID
  timeoutMs: number = 3000, // 新增：每个包的应答超时时间（默认3秒）
  delayMs: number = 20,     // 保持：收到应答后的延迟（默认20ms）
  onProgress?: (progress: number) => void  // 新增：进度回调函数，返回 0-100 的进度值
): Promise<boolean> => {
  if (!deviceId) {
    throw new Error('未找到已连接的设备ID');
  }
  
  if (!serviceUUID) {
    throw new Error('未找到服务UUID');
  }
  
  if (!writeUUID) {
    throw new Error('未找到写特征UUID');
  }
  
  if (!notifyUUID) {
    throw new Error('未找到通知特征UUID，无法接收设备应答');
  }
  
  try {
    const bytes = new Uint8Array(buffer);
    const packetSize = 20; // BLE 4.0 最大20字节
    const totalPackets = Math.ceil(bytes.length / packetSize);
    
    console.log(`准备分包发送数据，总大小: ${bytes.length} 字节，共 ${totalPackets} 个数据包`);
    
    Taro.showToast({
      title: `准备发送 ${totalPackets} 个数据包`,
      icon: 'none',
      duration: 1500
    });
    
    // iOS 和 Android 系统处理方式不同
    const isIOS = Taro.getSystemInfoSync().platform === 'ios';
    
    // 定义应答等待的变量
    let resolveAck: (value: boolean) => void;
    let ackPromise: Promise<boolean>;
    
    // 创建特征值变化的监听器
    const handleCharacteristicValueChange = (result: any) => {
      // 检查是否是目标设备的应答
      if (result.deviceId === deviceId && 
          result.serviceId === serviceUUID && 
          result.characteristicId === notifyUUID) {
        
        const resValue = new Uint8Array(result.value, 0);
        console.log('收到设备应答:', resValue);
        
        // 根据协议判断应答是否成功
        // 这里假设：只要收到应答且长度>0就认为成功
        // 实际项目中应根据具体协议调整判断逻辑
        const isSuccess = resValue.length > 0;
        
        // 解析等待中的 Promise
        if (resolveAck) {
          resolveAck(isSuccess);
        }
      }
    };
    
    // 注册监听器
    Taro.onBLECharacteristicValueChange(handleCharacteristicValueChange);
    
    for (let i = 0; i < totalPackets; i++) {
      const start = i * packetSize;
      const end = Math.min(start + packetSize, bytes.length);
      const packetData = bytes.slice(start, end);
      
      // 在每个数据包前添加 7E 帧头
      const packetWithHeader = new Uint8Array(packetData.length + 1);
      packetWithHeader[0] = 0x7E; // 添加帧头 7E
      packetWithHeader.set(packetData, 1); // 复制原始数据
      
      // 创建当前数据包的 ArrayBuffer
      const packetBuffer = packetWithHeader.buffer;
      
      let success = false;
      let attemptCount = 0;
      const maxAttempts = 3; // 最多重试3次
      
      while (!success && attemptCount < maxAttempts) {
        attemptCount++;
        
        try {
          // 为当前包创建应答等待 Promise
          ackPromise = new Promise<boolean>((resolve, reject) => {
            resolveAck = resolve;
            
            // 设置超时保护
            setTimeout(() => {
              reject(new Error(`第 ${i + 1}/${totalPackets} 个数据包等待应答超时 (${timeoutMs}ms)`));
            }, timeoutMs);
          });
          
          // 发送数据包
          await Taro.writeBLECharacteristicValue({
            deviceId,
            serviceId: serviceUUID,
            characteristicId: writeUUID,
            value: packetBuffer
          });
          
          console.log(`第 ${i + 1}/${totalPackets} 个数据包已发送，等待设备应答...`);
          
          // 等待设备应答
          const ackResult = await ackPromise;
          
          if (ackResult) {
            console.log(`第 ${i + 1}/${totalPackets} 个数据包应答成功`);
            success = true;
            
            // 收到应答后，延迟一下再发送下一个包（给设备处理时间）
            if (i < totalPackets - 1) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          } else {
            console.warn(`第 ${i + 1}/${totalPackets} 个数据包收到失败应答`);
            throw new Error('设备返回失败应答');
          }
        } catch (error) {
          console.warn(`第 ${i + 1}/${totalPackets} 个数据包发送/应答失败 (尝试 ${attemptCount}/${maxAttempts})`, error);
          
          // 如果不是最后一次尝试，等待后重试
          if (attemptCount < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs * 2)); // 重试时增加延迟
          } else {
            console.error(`第 ${i + 1}/${totalPackets} 个数据包发送失败，已达到最大重试次数`);
            throw error;
          }
        }
      }
      
      if (!success) {
        throw new Error(`第 ${i + 1}/${totalPackets} 个数据包发送失败`);
      }
      
      // 发送进度回调
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalPackets) * 100);
        onProgress(progress);
      }
    }
    
    // 所有包发送完成，取消监听
    Taro.offBLECharacteristicValueChange(handleCharacteristicValueChange);
    console.log('所有数据包发送完成');
    return true;
  } catch (error) {
    console.error('分包发送数据失败:', error);
    // 发生错误时也取消监听，避免内存泄漏
    Taro.offBLECharacteristicValueChange(handleCharacteristicValueChange);
    return false;
  }
};