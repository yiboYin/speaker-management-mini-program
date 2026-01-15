import React, { useState } from 'react';
import { View, Text, Button, Slider, Switch, Picker, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const IntervalPlayPage: React.FC = () => {
  const [playData, setPlayData] = useState<{
    fileName: string;
    filePath: string;
    volume: number;
    relayEnabled: boolean;
    interval: number;
  }>({ 
    fileName: '',
    filePath: '',
    volume: 15,
    relayEnabled: false,
    interval: 5
  });

  const { volume, relayEnabled, interval } = playData;

  return (
    <View className="interval-play-page">
      <View className="content">
        <View className="form-item">
          <Text className="label">音频</Text>
          <Picker 
            mode="selector"
            onClick={() => {
              Taro.chooseMessageFile({
                count: 1,
                type: 'file',
                success: (res) => {
                  if(res.tempFiles && res.tempFiles.length > 0) {
                    const file = res.tempFiles[0];
                    setPlayData({
                      ...playData, 
                      fileName: file.name,
                      filePath: file.path
                    });
                  }
                },
                fail: (err) => {
                  console.error('选择文件失败:', err);
                }
              }).catch(err => {
                console.error('选择文件错误:', err);
              });
            }}
          >
            <View className="file-picker">
              {playData.fileName || '请选择文件'}
            </View>
          </Picker>
        </View>
        
        <View className="form-item">
          <Text className="label">音量</Text>
          <View className="slider-container">
            <Slider 
              value={volume} 
              min={0} 
              max={30} 
              onChange={(e) => setPlayData({...playData, volume: e.detail.value})}
              showValue
            />
          </View>
        </View>
        
        <View className="form-item">
          <Text className="label">继电器</Text>
          <Switch 
            checked={relayEnabled} 
            onChange={(e) => setPlayData({...playData, relayEnabled: e.detail.value})}
          />
        </View>
        
        <View className="form-item">
          <Text className="label">间隔（秒）</Text>
          <Input
            type="number"
            className="interval-input"
            value={interval.toString()}
            onInput={(e) => setPlayData({...playData, interval: Number(e.detail.value)})}
          />
        </View>
      </View>
      <View className="bottom-button-container">
        <Button className="confirm-button">确定</Button>
      </View>
    </View>
  );
};

export default IntervalPlayPage;