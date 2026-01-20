import React, { useState, useEffect } from 'react';
import { View, Text, Button, Slider, Switch, Picker, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import './index.scss';

interface IntervalTask {
  id: string;
  taskName: string;
  fileName: string;
  filePath: string;
  volume: number;
  relayEnabled: boolean;
  interval: number;
}

const IntervalPlayPage: React.FC = () => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 区分编辑和新增模式
  const [taskId, setTaskId] = useState<string>(''); // 存储任务ID
  // 定义备选文件列表（与定时播放编辑页面保持一致）
  const availableFiles = [
    { name: '音频1.mp3', path: '/path/to/audio1.mp3' },
    { name: '音频2.mp3', path: '/path/to/audio2.mp3' },
    { name: '音频3.mp3', path: '/path/to/audio3.mp3' },
    { name: '音频4.mp3', path: '/path/to/audio4.mp3' }
  ];
  
  const [playData, setPlayData] = useState<{
    fileName: string;
    filePath: string;
    volume: number;
    relayEnabled: boolean;
    interval: number;
  }>({ 
    fileName: availableFiles[0].name,
    filePath: availableFiles[0].path,
    volume: 15,
    relayEnabled: false,
    interval: 5
  });
  
  useLoad((options) => {
    // 如果URL中有任务数据，则解析并初始化页面
    if (options && options.data) {
      try {
        const decodedData = decodeURIComponent(options.data as string);
        const taskData: IntervalTask = JSON.parse(decodedData);
        
        // 更新页面状态
        setPlayData({
          fileName: taskData.fileName,
          filePath: taskData.filePath,
          volume: taskData.volume,
          relayEnabled: taskData.relayEnabled,
          interval: taskData.interval
        });
        
        // 设置编辑模式和任务ID
        setIsEditing(true);
        setTaskId(taskData.id);
        
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('解析任务数据失败:', error);
      }
    } else {
      // 如果没有传递数据，则表示是新增模式
      setIsEditing(false);
    }
  });

  const { volume, relayEnabled, interval } = playData;

  return (
    <View className="interval-play-page">
      <View className="content">
        <View className="form-item">
          <Text className="label">音频</Text>
          <Picker 
            mode="selector"
            range={availableFiles.map(file => file.name)}
            onChange={(e) => {
              const selectedFile = availableFiles[e.detail.value];
              setPlayData({
                ...playData, 
                fileName: selectedFile.name,
                filePath: selectedFile.path
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
        <Button 
          className="confirm-button" 
          onClick={() => {
            // 根据是编辑模式还是新增模式执行不同操作
            if (isEditing) {
              // 编辑模式：更新现有任务
              Taro.eventCenter.trigger('updateIntervalTask', {
                id: taskId,
                taskName: '间隔播放', // 默认任务名称
                ...playData
              });
            } else {
              // 新增模式：添加新任务
              Taro.eventCenter.trigger('addNewIntervalTask', {
                ...playData,
                taskName: '间隔播放' // 默认任务名称
              });
            }
            
            // 返回任务页面
            Taro.navigateBack();
          }}
        >
          确定
        </Button>
      </View>
    </View>
  );
};

export default IntervalPlayPage;