import Taro, { getStorageSync } from '@tarojs/taro';
import { Device } from '../types/device';
import { FILE_COMMANDS } from '@/constants/bluetoothCommands';

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
export const writeCommandToDevice = async (command: string, deviceId: string, serviceUUID: string, writeUUID: string, notifyUUID?: string): Promise<boolean> => {
  // 如果命令长度超过20字节，则使用分包发送
  const buffer = hexStringToArrayBuffer(command);
  if (buffer.byteLength > 20) {
    return writeCommandToDeviceWithSplit(buffer, deviceId, serviceUUID, writeUUID, notifyUUID || '');
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
  
  // 标记监听器是否已注册（在try块外声明，确保catch块也能访问）
  let listenerRegistered = false;
  // 监听器函数引用（在try块外声明，确保catch块也能访问）
  let handleCharacteristicValueChange: ((result: any) => void) | null = null;
  
  try {
    // 开启屏幕常亮，防止传输过程中息屏导致连接断开
    await Taro.setKeepScreenOn({ keepScreenOn: true });
    console.log('已开启屏幕常亮');
    
    const bytes = new Uint8Array(buffer);
    const maxDataPerPacket = 128; // 每包固定128字节数据
    const packetTotalSize = 1 + 2 + maxDataPerPacket + 1; // 帧头(1) + 帧序号(2) + 数据(256) + 校验位(1) = 260字节
    
    console.log(`准备分包发送数据:`, {
      原始数据大小: bytes.length,
      每包数据量: maxDataPerPacket,
      包总长度: packetTotalSize,
      预计包数: Math.ceil(bytes.length / maxDataPerPacket)
    });
    
    Taro.showToast({
      title: `开始传输 ${bytes.length} 字节`,
      icon: 'none',
      duration: 1500
    });
    
    // 定义应答等待的变量
    let resolveAck: (value: boolean) => void;
    let ackPromise: Promise<boolean>;
    
    // 创建特征值变化的监听器
    handleCharacteristicValueChange = (result: any) => {
      // 检查是否是目标设备的应答
      if (result.deviceId === deviceId && 
          result.serviceId === serviceUUID && 
          result.characteristicId === notifyUUID) {
        
        const resValue = new Uint8Array(result.value, 0);
        console.log('收到设备应答:', resValue);
        
        // 根据协议严格判断应答是否成功
        // 成功的应答格式: 7E 04 02 02 36 01
        // - 7E: 帧头
        // - 04: 整体长度
        // - 02: 方向标识（上行，设备发给手机）
        // - 02: 固定值
        // - 36: 命令码（文件传输确认）
        // - 01: 结果码（成功）
        let isSuccess = false;
        
        if (resValue.length === 6 && 
            resValue[0] === 0x7E &&  // 帧头
            resValue[1] === 0x04 &&  // 整体长度
            resValue[2] === 0x02 &&  // 方向标识（上行）
            resValue[3] === 0x02 &&  // 固定值
            resValue[4] === 0x36 &&  // 命令码（文件传输确认）
            resValue[5] === 0x01) {  // 结果码（成功）
          isSuccess = true;
          console.log('设备应答验证通过：文件传输确认成功');
        } else {
          console.warn('设备应答验证失败，期望: 7E 04 02 02 36 01, 实际:', 
            Array.from(resValue).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
          isSuccess = false;
        }
        
        // 解析等待中的 Promise
        if (resolveAck) {
          resolveAck(isSuccess);
        }
      }
    };
    
    // 注册监听器
    Taro.onBLECharacteristicValueChange(handleCharacteristicValueChange);
    listenerRegistered = true; // 标记监听器已注册
    
    // 使用 while 循环，基于已发送字节数判断是否完成
    let sentBytes = 0; // 已发送的字节数
    let packetIndex = 0; // 包索引，从0开始
    
    // 获取平台信息，用于差异化处理
    const platform = Taro.getSystemInfoSync().platform;
    const isAndroid = platform === 'android';
    const retryDelay = isAndroid ? 250 : 50; // Android重试延迟250ms，其他平台50ms
    const maxRetries = 3; // 最大重试次数
    
    while (sentBytes < bytes.length) {
      // 计算当前包的实际数据起始和结束位置
      const dataStart = sentBytes;
      const dataEnd = Math.min(dataStart + maxDataPerPacket, bytes.length);
      const packetData = bytes.slice(dataStart, dataEnd);
      
      // 构建数据包：帧头(1) + 帧序号(2) + 数据(实际长度) + 校验位(1)
      const packetTotalSize = 1 + 2 + packetData.length + 1; // 根据实际数据长度动态计算
      const packetWithHeader = new Uint8Array(packetTotalSize);
      
      // 帧头
      packetWithHeader[0] = 0x7E;
      
      // 帧序号（2字节，大端序）
      packetWithHeader[1] = (packetIndex >> 8) & 0xFF;   // 高字节
      packetWithHeader[2] = packetIndex & 0xFF;           // 低字节
      
      // 数据主体（实际长度）
      packetWithHeader.set(packetData, 3);
      
      // 计算校验位：所有字节相加取低8位
      let checksum = 0;
      for (let i = 0; i < packetTotalSize - 1; i++) {
        checksum += packetWithHeader[i];
      }
      packetWithHeader[packetTotalSize - 1] = checksum & 0xFF;
      
      // 创建当前数据包的 ArrayBuffer
      const packetBuffer = packetWithHeader.buffer;
      
      console.log(`第 ${packetIndex + 1} 个数据包结构:`, {
        帧头: '0x7E',
        帧序号: packetIndex,
        实际数据长度: packetData.length,
        总长度: packetTotalSize,
        校验位: `0x${(checksum & 0xFF).toString(16).toUpperCase().padStart(2, '0')}`,
        已发送字节: sentBytes,
        剩余字节: bytes.length - sentBytes
      });
      
      // 打印完整的包数据（十六进制）
      const hexStr = Array.from(packetWithHeader)
        .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');
      console.log(`第 ${packetIndex + 1} 个数据包内容 (HEX):`, hexStr);
      console.log(`第 ${packetIndex + 1} 个数据包 buffer:`, packetBuffer);
      
      // 重试逻辑：最多重试 maxRetries 次
      let retryCount = 0;
      let sendSuccess = false;
      
      while (retryCount < maxRetries && !sendSuccess) {
        try {
          // 为当前包创建应答等待 Promise
          ackPromise = new Promise<boolean>((resolve, reject) => {
            resolveAck = resolve;
            
            // 设置超时保护
            setTimeout(() => {
              reject(new Error(`第 ${packetIndex + 1} 个数据包等待应答超时 (${timeoutMs}ms)`));
            }, timeoutMs);
          });
          
          // 发送数据包
          await Taro.writeBLECharacteristicValue({
            deviceId,
            serviceId: serviceUUID,
            characteristicId: writeUUID,
            value: packetBuffer
          });
          
          console.log(`第 ${packetIndex + 1} 个数据包已发送（尝试 ${retryCount + 1}/${maxRetries}），等待设备应答...`);
          
          // 等待设备应答
          const ackResult = await ackPromise;
          
          // ackResult 由监听器中的严格校验决定
          // 只有收到 7E 04 02 02 36 01 才为 true，其他情况均为 false
          if (ackResult) {
            console.log(`第 ${packetIndex + 1} 个数据包应答成功`);
            sendSuccess = true;
            
            // 更新已发送字节数
            sentBytes += packetData.length;
            
            // 收到应答后，延迟一下再发送下一个包（给设备处理时间）
            if (sentBytes < bytes.length) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          } else {
            console.warn(`第 ${packetIndex + 1} 个数据包收到失败应答（应答码不符合预期）`);
            throw new Error('设备返回失败应答');
          }
        } catch (error) {
          retryCount++;
          console.error(`第 ${packetIndex + 1} 个数据包发送/应答失败（尝试 ${retryCount}/${maxRetries}）`, error);
          
          // 如果还有重试机会，等待后重试
          if (retryCount < maxRetries) {
            console.log(`${retryDelay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            // 达到最大重试次数，抛出错误
            console.error(`第 ${packetIndex + 1} 个数据包已达到最大重试次数，发送失败`);
            throw error;
          }
        }
      }
      
      // 发送进度回调
      if (onProgress) {
        const progress = Math.round((sentBytes / bytes.length) * 100);
        onProgress(progress);
      }
      
      // 包索引递增
      packetIndex++;
    }
    
    // 所有包发送完成，取消监听
    if (listenerRegistered && handleCharacteristicValueChange) {
      Taro.offBLECharacteristicValueChange(handleCharacteristicValueChange);
    }
    console.log('所有数据包发送完成');
    return true;
  } catch (error) {
    console.error('分包发送数据失败:', error);

    // 1. 先取消监听（避免后面发送结束指令时再次触发 notify 回调）
    if (listenerRegistered && handleCharacteristicValueChange) {
      Taro.offBLECharacteristicValueChange(handleCharacteristicValueChange);
      listenerRegistered = false;
    }

    // 2. 通知设备终止本次传输，不再接收后续数据包
    // 使用直接写入，不再注册新的监听，也忽略设备可能的返回
    try {
      const endBuffer = hexStringToArrayBuffer(FILE_COMMANDS.END_FILE_TRANSFER);
      await Taro.writeBLECharacteristicValue({
        deviceId,
        serviceId: serviceUUID,
        characteristicId: writeUUID,
        value: endBuffer
      });
      console.log('已向设备发送传输结束指令(异常终止)');
    } catch (endError) {
      // 结束指令发送失败不影响主错误的上报，仅记录日志
      console.error('发送异常终止指令失败:', endError);
    }

    // 显示错误提示
    const errorMessage = error instanceof Error ? error.message : error;
    Taro.showToast({
      title: `传输失败: ${errorMessage}`,
      icon: 'none',
      duration: 2000
    });

    return false;
  } finally {
    // 无论成功或失败，都要关闭屏幕常亮
    try {
      await Taro.setKeepScreenOn({ keepScreenOn: false });
      console.log('已关闭屏幕常亮');
    } catch (keepScreenError) {
      console.error('关闭屏幕常亮失败:', keepScreenError);
    }
  }
};

// 发送当前时间到设备
export const sendCurrentTimeToDevice = async (): Promise<boolean> => {
  try {
    // 获取当前连接的设备
    const device = getConnectedDevice();
    if (!device) {
      console.error('未找到已连接的设备');
      return false;
    }
    
    // 获取当前时间
    const now = new Date();
    const year = now.getFullYear() - 2000; // 从2000年算起
    const month = now.getMonth() + 1; // 月份从0开始，需要+1
    const dayOfWeek = now.getDay(); // 0=星期日, 1=星期一, ..., 6=星期六
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
    
    // 构造7字节时间数据
    const timeBytes = [
      year & 0xFF,        // 年（从2000年算起）
      month & 0xFF,       // 月
      dayOfWeek & 0xFF,   // 星期（0-6）
      day & 0xFF,         // 日
      hour & 0xFF,        // 时
      minute & 0xFF,      // 分
      second & 0xFF       // 秒
    ];
    
    // 转换为十六进制字符串
    const timeDataHex = timeBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    console.log('当前时间:', {
      year: now.getFullYear(),
      month,
      dayOfWeek,
      day,
      hour,
      minute,
      second
    });
    console.log('时间数据（HEX）:', timeDataHex);
    
    // 构造时间同步指令
    // 格式: 7E [整体长度] 01 02 A0 [7Byte时间数据]
    // 整体长度 = 命令码(2) + 方向(1) + 数据(7) = 10 = 0x0A
    const command = `7E 0A 01 02 A0 ${timeDataHex}`;
    
    console.log('发送时间同步指令:', command);
    
    // 发送指令并等待确认
    await new Promise<boolean>((resolve, reject) => {
      let timeoutId: any;
      
      sendCommandToDevice(command, (data) => {
        console.log('时间同步响应:', data);
        
        // 清除超时定时器
        if (timeoutId) clearTimeout(timeoutId);
        
        // 检查应答是否成功
        // 预期响应: 7E 03 02 02 A1
        if (data && data.resValue && data.resValue.length >= 4) {
          const responseCmd = data.resValue[1]; // 应该是 0xA1
          
          if (responseCmd === 0xA1) {
            console.log('时间同步成功');
            resolve(true);
          } else {
            console.warn('收到未知响应命令码:', responseCmd.toString(16));
            resolve(false);
          }
        } else {
          console.warn('收到无效应答');
          resolve(false);
        }
        
        return false; // 取消监听
      });
      
      // 设置超时保护（3秒）
      timeoutId = setTimeout(() => {
        console.error('等待时间同步应答超时');
        reject(new Error('等待时间同步应答超时'));
      }, 3000);
    });
    
    return true;
  } catch (error) {
    console.error('发送时间同步失败:', error);
    return false;
  }
};