import React, { useState } from 'react';
import { View, Text, Button, Slider, Switch, Picker, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const ScheduleEditPage: React.FC = () => {
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
    fileName: '',
    filePath: '',
    selectedDays: [],
    volume: 15,
    relayEnabled: false,
    startTime: '00:00',
    endTime: '23:59'
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
            onClick={() => {
              Taro.chooseMessageFile({
                count: 1,
                type: 'file',
                success: (res) => {
                  if(res.tempFiles && res.tempFiles.length > 0) {
                    const file = res.tempFiles[0];
                    setScheduleData({
                      ...scheduleData, 
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
        <Button className="confirm-button">确定</Button>
      </View>
    </View>
  );
};

export default ScheduleEditPage;