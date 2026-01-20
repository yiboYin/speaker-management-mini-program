import React, { useState, useEffect } from 'react';
import { View, Text, Button, Slider, Switch, Picker, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import './index.scss';

interface Task {
  id: string;
  taskName: string;
  fileName: string;
  filePath: string;
  selectedDays: string[];
  volume: number;
  relayEnabled: boolean;
  startTime: string;
  endTime: string;
}

const ScheduleEditPage: React.FC = () => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 区分编辑和新增模式
  const [taskId, setTaskId] = useState<string>(''); // 存储任务ID
  // 定义备选文件列表
  const availableFiles = [
    { name: '音频1.mp3', path: '/path/to/audio1.mp3' },
    { name: '音频2.mp3', path: '/path/to/audio2.mp3' },
    { name: '音频3.mp3', path: '/path/to/audio3.mp3' },
    { name: '音频4.mp3', path: '/path/to/audio4.mp3' }
  ];
  
  const [scheduleData, setScheduleData] = useState<{
    taskName: string;
    fileName: string;
    filePath: string;
    selectedDays: string[];
    volume: number;
    relayEnabled: boolean;
    startTime: string;
    endTime: string;
  }>({ 
    taskName: '',
    fileName: availableFiles[0].name,
    filePath: availableFiles[0].path,
    selectedDays: [],
    volume: 15,
    relayEnabled: false,
    startTime: '00:00',
    endTime: '23:59'
  });
  
  useLoad((options) => {
    // 如果URL中有任务数据，则解析并初始化页面
    if (options && options.data) {
      try {
        const decodedData = decodeURIComponent(options.data as string);
        const taskData: Task = JSON.parse(decodedData);
        
        // 更新页面状态
        setScheduleData({
          taskName: taskData.taskName,
          fileName: taskData.fileName,
          filePath: taskData.filePath,
          selectedDays: taskData.selectedDays,
          volume: taskData.volume,
          relayEnabled: taskData.relayEnabled,
          startTime: taskData.startTime,
          endTime: taskData.endTime
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
  
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  
  const handleDayToggle = (day: string) => {
    if (scheduleData.selectedDays.includes(day)) {
      setScheduleData({
        ...scheduleData,
        selectedDays: scheduleData.selectedDays.filter(d => d !== day)
      });
    } else {
      setScheduleData({
        ...scheduleData,
        selectedDays: [...scheduleData.selectedDays, day]
      });
    }
  };
  
  const { selectedDays, volume, relayEnabled, startTime, endTime } = scheduleData;
  
  return (
    <View className="schedule-edit-page">
      <View className="content">
        <View className="form-item">
          <Text className="label">任务名称</Text>
          <Input 
            className="task-name-input"
            placeholder="请输入任务名称"
            value={scheduleData.taskName}
            onInput={(e) => setScheduleData({...scheduleData, taskName: e.detail.value})}
          />
        </View>
        
        <View className="form-item">
          <Text className="label">音频</Text>
          <Picker 
            mode="selector"
            range={availableFiles.map(file => file.name)}
            onChange={(e) => {
              const selectedFile = availableFiles[e.detail.value];
              setScheduleData({
                ...scheduleData, 
                fileName: selectedFile.name,
                filePath: selectedFile.path
              });
            }}
          >
            <View className="file-picker">
              {scheduleData.fileName || '请选择文件'}
            </View>
          </Picker>
        </View>
        
        <View className="form-item">
          <Text className="label">星期</Text>
          <View className="day-selector">
            {days.map(day => (
              <View 
                key={day} 
                className="day-item"
                onClick={() => handleDayToggle(day)}
              >
                <View className={`day-circle ${selectedDays.includes(day) ? 'selected' : ''}`}>
                  {day}
                </View>
              </View>
            ))}
          </View>
        </View>
        
        <View className="form-item">
          <Text className="label">音量</Text>
          <View className="slider-container">
            <Slider 
              value={volume} 
              min={0} 
              max={30} 
              onChange={(e) => setScheduleData({...scheduleData, volume: e.detail.value})}
              showValue
            />
          </View>
        </View>
        
        <View className="form-item">
          <Text className="label">继电器</Text>
          <Switch 
            checked={relayEnabled} 
            onChange={(e) => setScheduleData({...scheduleData, relayEnabled: e.detail.value})}
          />
        </View>
        
        <View className="form-item">
          <Text className="label">开始时间</Text>
          <Picker 
            mode="time" 
            value={startTime} 
            onChange={(e) => setScheduleData({...scheduleData, startTime: e.detail.value})}
          >
            <View className="time-picker">
              {startTime}
            </View>
          </Picker>
        </View>
        
        <View className="form-item">
          <Text className="label">结束时间</Text>
          <Picker 
            mode="time" 
            value={endTime} 
            onChange={(e) => setScheduleData({...scheduleData, endTime: e.detail.value})}
          >
            <View className="time-picker">
              {endTime}
            </View>
          </Picker>
        </View>
      </View>
      <View className="bottom-button-container">
        <Button 
          className="confirm-button" 
          onClick={() => {
            console.log('确定按钮点击', Taro.eventCenter);
            // 根据是编辑模式还是新增模式执行不同操作
            if (isEditing) {
              // 编辑模式：更新现有任务
              Taro.eventCenter.trigger('updateTask', {
                id: taskId,
                ...scheduleData
              });
            } else {
              // 新增模式：添加新任务
              Taro.eventCenter.trigger('addNewTask', scheduleData);
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

export default ScheduleEditPage;