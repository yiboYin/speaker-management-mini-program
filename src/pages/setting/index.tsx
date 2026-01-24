import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro';
import { View, Button, Input } from '@tarojs/components';
import { arrayBufferToHex, getConnectedDevice } from '@/utils/deviceUtils'; // 导入获取连接设备的函数
import { Device } from '@/types/device';
import './index.scss';

const SettingPage: React.FC = () => {
  const buttons = [
    { text: '恢复出厂设置', action: 'factoryReset' },
    { text: '开关机', action: 'powerToggle' },
    { text: '灯模式', action: 'lightMode' },
    { text: '定时', action: 'schedule' },
    { text: '上电播放', action: 'powerPlay' },
    { text: '到点循环', action: 'timeLoop' },
    { text: '上一首', action: 'previous' },
    { text: '播放/停止', action: 'playPause' },
    { text: '下一首', action: 'next' },
    { text: '音量加', action: 'volumeUp' },
    { text: '音量减', action: 'volumeDown' }
  ];
  
  const [ledText, setLedText] = useState('');
  
  interface FileItem {
    id: string;
    name: string;
    duration?: string; // 可选的时长信息
  }
  
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  


  // 发送指令到设备的辅助函数
  const sendCommandToDevice = async (deviceId: string, command: string) => {
    try {
      // 获取设备的所有服务
      const services = await Taro.getBLEDeviceServices({
        deviceId
      });
      console.log('设备所有服务:', services);
      
      // 假设我们要找的服务UUID，实际开发中需要根据设备规格确定
      let serviceId = '';
      for (let i = 0; i < services.services.length; i++) {
        const service = services.services[i];
        // 这里可以根据特定的服务UUID进行筛选，示例中使用第一个非系统服务
        if (!service.uuid.startsWith('000018')) { // 排除标准蓝牙服务
          serviceId = service.uuid;
          break;
        }
      }
      
      if (!serviceId) {
        throw new Error('未找到合适的服务');
      }
      
      // 获取服务下的特征值
      const characteristics = await Taro.getBLEDeviceCharacteristics({
        deviceId,
        serviceId
      });
      
      // 查看返回结果
      console.log('设备特征值:', characteristics);
      
      // 查找支持notify和write的特征值
      let notifyCharacteristicId = '';
      let writeCharacteristicId = '';
      
      for (let i = 0; i < characteristics.characteristics.length; i++) {
        const characteristic = characteristics.characteristics[i];
        if (!notifyCharacteristicId && characteristic.properties.notify) { // 查找支持notify的特征值
          notifyCharacteristicId = characteristic.uuid;
        }
        if (!writeCharacteristicId && (characteristic.properties.write || characteristic.properties.writeWithoutResponse)) { // 查找支持write的特征值
          writeCharacteristicId = characteristic.uuid;
        }
        
        // 如果找到了所需的两种特征值，则退出循环
        if (notifyCharacteristicId && writeCharacteristicId) {
          break;
        }
      }
      
      if (!notifyCharacteristicId) {
        throw new Error('未找到支持notify的特征值');
      }
      
      // 启用特征值变化监听
      const notifyResult = await Taro.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId: notifyCharacteristicId,
        state: true, // 启用通知
      });
      
      console.log('notifyBLECharacteristicValueChange回调结果:', notifyResult);
      
      
      // 如果找到了支持write的特征值，则向它写入数据
      if (writeCharacteristicId) {
        try {
          // 将指令转换为ArrayBuffer
          const buffer = hexStringToArrayBuffer('7E 19 02 EF');
          console.log('将指令转换为ArrayBuffer:', buffer);
          // 向特征值写入数据
          await Taro.writeBLECharacteristicValue({
            deviceId,
            serviceId,
            characteristicId: writeCharacteristicId,
            value: buffer,
          });
          
          console.log('成功向特征值写入数据: 7E 19 02 EF');
        } catch (error) {
          console.error('写入特征值失败:', error);
        }
      }
      
      // 监听特征值变化
      Taro.onBLECharacteristicValueChange((result) => {
        console.log('特征值变化:', result);
        // 处理从设备接收到的数据
        if (result.deviceId === deviceId && result.serviceId === serviceId && result.characteristicId === notifyCharacteristicId) {
          console.log('收到设备数据:', result.value);
          let hex = arrayBufferToHex(result.value).toUpperCase();
          console.log(hex);
        }
      });
      Taro.showToast({
        title: '指令发送成功',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('发送指令失败:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none',
        duration: 2000
      });
    }
  };
  
  // 将十六进制字符串转换为ArrayBuffer
  const hexStringToArrayBuffer = (hexString: string): ArrayBuffer => {
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
  
  // 在组件挂载时获取当前连接的设备
  useEffect(() => {
    const device = getConnectedDevice();
    
    console.log('当前连接的设备:', device);
  }, []);
  
  const handleButtonClick = (action: string) => {
    console.log(`执行操作: ${action}`);
    // 这里可以添加实际的功能逻辑
  };
  
  const handleSendLed = () => {
    console.log(`发送LED内容: ${ledText}`);
    // 这里可以添加发送LED内容的实际功能逻辑
  };

  return (
    <View className="setting-page">
      <View className="control-panel">
        <View className="panel-title">控制面板</View>
        <View className="button-grid">
          {buttons.map((button, index) => (
            <Button 
              key={index} 
              className="grid-button"
              onClick={() => handleButtonClick(button.action)}
            >
              {button.text}
            </Button>
          ))}
        </View>
      </View>
      
      {/* LED屏幕 */}
      <View className="led-screen">
        <View className="led-title">LED屏幕</View>
        <View className="led-input-container">
          <Input 
            className="led-input" 
            placeholder="输入LED屏幕显示内容" 
            value={ledText}
            onInput={(e) => setLedText(e.detail.value)}
          />
          <Button className="send-led-btn" onClick={handleSendLed}>发送</Button>
        </View>
      </View>
      
      <View className="file-list-section">
        <View className="file-list-header">
          <View className="section-title">文件列表</View>
          <Button 
            className="read-file-btn"
            onClick={() => {
              // 首先检查是否已连接设备
              const device = getConnectedDevice();
              if (!device) {
                // 未连接设备，提示用户
                Taro.showToast({
                  title: '请先连接设备',
                  icon: 'none',
                  duration: 2000
                });
                return;
              }
              
              // 已连接设备，向设备发送指令
              console.log('已连接设备，发送指令: 7E 04 20 00 04 EF');
              
              // 发送指令到设备
              sendCommandToDevice(device.deviceId, '7E 04 20 00 04 EF');
              
              // 模拟读取文件
              console.log('读取文件');
              

            }}
          >
            读取文件
          </Button>
        </View>
        <View className="file-list-container">
          {fileList.length > 0 ? (
            fileList.map(file => (
              <View 
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
                key={file.id}
                onClick={() => setSelectedFileId(file.id === selectedFileId ? null : file.id)}
              >
                <View className="file-name">{file.name}</View>
                <View className="file-duration">{file.duration}</View>
                <Button 
                  className="play-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止冒泡，避免影响选中状态
                    console.log(`试听${file.name}`);
                  }}
                >
                  试听
                </Button>
              </View>
            ))
          ) : (
            <View className="empty-file-list">
              暂无文件
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default SettingPage;