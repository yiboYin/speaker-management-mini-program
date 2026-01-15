import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro';
import { View, Button, Input } from '@tarojs/components';
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
            onClick={() => console.log('读取文件')}
          >
            读取文件
          </Button>
        </View>
        <View className="file-list-container">
          {/* 文件列表内容将在这里添加 */}
          <View className="file-item">
            <View className="file-name">示例文件1.mp3</View>
            <Button 
              className="play-btn"
              onClick={() => console.log('试听示例文件1.mp3')}
            >
              试听
            </Button>
          </View>
          <View className="file-item">
            <View className="file-name">示例文件2.mp3</View>
            <Button 
              className="play-btn"
              onClick={() => console.log('试听示例文件2.mp3')}
            >
              试听
            </Button>
          </View>
          <View className="file-item">
            <View className="file-name">示例文件3.mp3</View>
            <Button 
              className="play-btn"
              onClick={() => console.log('试听示例文件3.mp3')}
            >
              试听
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SettingPage;