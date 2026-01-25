import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro';
import { View, Button, Input } from '@tarojs/components';
import { ab2hex, hexCharCodeToStr, getConnectedDevice, hexStringToArrayBuffer, listenToDeviceData, writeCommandToDevice, sendCommandToDevice } from '@/utils/deviceUtils'; // 导入获取连接设备的函数和十六进制转换函数
import { Device } from '@/types/device';
import { getDeviceId, getServiceUUID, getWriteUUID, getNotifyUUID, getFilterServiceUUID } from '@/utils/bluetoothConfig';
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
  


  
  
  
  

  
  const handleButtonClick = (action: string) => {
    console.log(`执行操作: ${action}`);
    
    // 根据不同的操作发送相应的指令
    let command = '';
    switch(action) {
      case 'factoryReset':
        command = '7E 02 16 EF'; // 恢复出厂设置指令
        break;
      case 'powerToggle':
        command = '7E 02 82 EF'; // 开关机指令
        break;
      case 'lightMode':
        command = '7E 01 02 00 01 EF'; // 灯模式指令
        break;
      case 'schedule':
        command = '7E 02 84 EF'; // 定时指令
        break;
      case 'powerPlay':
        command = '7E 02 22 EF'; // 上电播放指令
        break;
      case 'timeLoop':
        command = '7E 03 15 00 EF'; // 到点循环指令
        break;
      case 'previous':
        command = '7E 02 85 EF'; // 上一首指令
        break;
      case 'playPause':
        command = '7E 02 83 EF'; // 播放/停止指令
        break;
      case 'next':
        command = '7E 02 86 EF'; // 下一首指令
        break;
      case 'volumeUp':
        command = '7E 02 80 EF'; // 音量加指令
        break;
      case 'volumeDown':
        command = '7E 02 81 EF'; // 音量减指令
        break;
      default:
        console.log(`未知操作: ${action}`);
        return;
    }
    
    // 发送指令到设备
    sendCommandToDevice(command, (data) => {
      // 处理接收到的数据
      console.log(`${action}操作返回数据:`, data);
      
      // 如果是读取文件列表的操作，根据返回数据更新文件列表
      if (action === 'readFiles' && data.resValue && data.resValue.length >= 2) {
        // 获取resValue数组倒数第二位的值，表示文件数量
        const fileCountIndex = data.resValue.length - 2;
        const fileCount = data.resValue[fileCountIndex];
        
        console.log(`检测到设备上有 ${fileCount} 个文件`);
        
        // 创建fileList，文件名为“音频x”
        const newFileList = [];
        for (let i = 1; i <= fileCount; i++) {
          newFileList.push({
            id: `audio_${i}`,
            name: `音频${i}`
          });
        }
        
        setFileList(newFileList);
        console.log('更新后的文件列表:', newFileList);
      }
    }).then(() => {
      Taro.showToast({
        title: '指令发送成功',
        icon: 'success',
        duration: 2000
      });
    }).catch((error) => {
      console.error('发送指令失败:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none',
        duration: 2000
      });
    });
  };
  
  const handleSendLed = () => {
    console.log(`发送LED内容: ${ledText}`);
    // 这里可以添加发送LED内容的实际功能逻辑
  };
  
  const handlePlayFile = (e: any, fileIndex: number) => {
    e.stopPropagation(); // 阻止冒泡，避免影响选中状态
    console.log(`试听第${fileIndex}个文件`);
    
    // 发送试听指令，假设指令格式为 '7E 04 41 00 [文件索引] EF'
    const command = `7E 04 41 00 ${fileIndex.toString(16).padStart(2, '0')} EF`;
    
    sendCommandToDevice(command, (data) => {
      // 处理试听操作的返回数据
      console.log(`试听第${fileIndex}个文件返回数据:`, data);
    }).then(() => {
      Taro.showToast({
        title: '试听指令发送成功',
        icon: 'success',
        duration: 2000
      });
    }).catch((error) => {
      console.error('试听指令发送失败:', error);
      Taro.showToast({
        title: '试听指令发送失败',
        icon: 'none',
        duration: 2000
      });
    });
  };

  const handleReadFile = () => {
    // 已连接设备，向设备发送指令
    console.log('已连接设备，发送指令: 7E 02 19 EF');
    
    // 发送指令到设备
    sendCommandToDevice('7E 02 19 EF', (data) => {
      // 处理接收到的数据
      console.log('从设备接收到数据:', data);
      
      // 检查是否有resValue数据
      if (data.resValue && data.resValue.length >= 2) {
        // 获取resValue数组倒数第二位的值，表示文件数量
        const fileCountIndex = data.resValue.length - 2;
        const fileCount = data.resValue[fileCountIndex];
        
        console.log(`检测到设备上有 ${fileCount} 个文件`);
        
        // 创建fileList，文件名为“音频x”
        const newFileList = [];
        for (let i = 1; i <= fileCount; i++) {
          newFileList.push({
            id: `audio_${i}`,
            name: `音频${i}`
          });
        }
        
        setFileList(newFileList);
        console.log('更新后的文件列表:', newFileList);
      }
    }).then(() => {
      Taro.showToast({
        title: '指令发送成功',
        icon: 'success',
        duration: 2000
      });
    }).catch((error) => {
      console.error('发送指令失败:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none',
        duration: 2000
      });
    });
    
    // 模拟读取文件
    console.log('读取文件');
  }

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
            onClick={handleReadFile}
          >
            读取文件
          </Button>
        </View>
        <View className="file-list-container">
          {fileList.length > 0 ? (
            fileList.map((file, index) => (
              <View 
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
                key={file.id}
                onClick={() => setSelectedFileId(file.id === selectedFileId ? null : file.id)}
              >
                <View className="file-name">{file.name}</View>
                <Button 
                  className="play-btn"
                  onClick={(e) => handlePlayFile(e, index + 1)}
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