import React, { useState, useEffect } from 'react';
import { View, Text, Button, Slider, Switch, Picker, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import FileSelectorModal from '@/components/FileSelectorModal';
import './index.scss';

// 播放模式枚举
enum PlayMode {
  LOOP = 1,      // 循环播放
  SENSOR = 2,    // 感应播放
  SCHEDULED = 3  // 到点播放
}

interface Task {
  id: string;
  fileName: string; // 原始文件名，用于数据传输
  displayName?: string; // 展示用的文件名（可选）
  filePath: string;
  selectedDays: string[];
  volume: number;
  playMode: PlayMode; // 播放模式
  interval?: number; // 循环周期（秒），仅循环/感应模式
  startTime?: string; // 开始时间，仅循环/感应模式
  endTime?: string; // 结束时间，仅循环/感应模式
  scheduledTime?: string; // 播放时间，仅到点播放
  repeatCount?: number; // 重复次数，仅到点播放
}

const ScheduleEditPage: React.FC = () => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 区分编辑和新增模式
  const [taskId, setTaskId] = useState<string>(''); // 存储任务ID
  
  // 文件选择弹窗相关状态
  const [showFileModal, setShowFileModal] = useState(false); // 是否显示文件选择弹窗
  const [selectedFileId, setSelectedFileId] = useState<string>(''); // 当前选中的文件ID
  
  const [scheduleData, setScheduleData] = useState<{
    fileName: string; // 原始文件名，用于数据传输
    displayName: string; // 展示用的文件名
    filePath: string;
    selectedDays: string[];
    playMode: PlayMode; // 播放模式
    intervalMinutes: number; // 循环周期-分钟
    intervalSeconds: number; // 循环周期-秒数
    startTime: string; // 开始时间
    endTime: string; // 结束时间
    scheduledTime: string; // 播放时间（到点播放）
    repeatCount: number | ''; // 重复次数（到点播放），默认为空
  }>({ 
    fileName: '',
    displayName: '',
    filePath: '',
    selectedDays: [],
    playMode: PlayMode.LOOP, // 默认循环播放
    intervalMinutes: 0, // 默认0分钟
    intervalSeconds: 19, // 默认19秒
    startTime: '00:00',
    endTime: '23:59',
    scheduledTime: '19:00:00', // 默认19:00:00
    repeatCount: '' // 默认为空
  });
  
  // 初始化时设置默认选中文件（已移除，等待用户选择）
  
  useLoad((options) => {
    // 如果URL中有任务数据，则解析并初始化页面
    if (options && options.data) {
      try {
        const decodedData = decodeURIComponent(options.data as string);
        const taskData: Task = JSON.parse(decodedData);
        
        // 判断是否为全天（0:00-23:59）
        const isAllDay = taskData.startTime === '00:00' && taskData.endTime === '23:59';
        
        // 计算循环周期（如果有interval字段）
        let intervalMinutes = 0;
        let intervalSeconds = 19; // 默认值
        if (taskData.interval !== undefined) {
          intervalMinutes = Math.floor(taskData.interval / 60);
          intervalSeconds = taskData.interval % 60;
        }
        
        // 更新页面状态
        setScheduleData({
          fileName: taskData.fileName,
          displayName: taskData.displayName || taskData.fileName.replace(/\.mp3$/i, ''), // 如果没有displayName，从fileName提取
          filePath: taskData.filePath,
          selectedDays: taskData.selectedDays,
          playMode: taskData.playMode || PlayMode.LOOP,
          intervalMinutes,
          intervalSeconds,
          startTime: taskData.startTime || '00:00',
          endTime: taskData.endTime || '23:59',
          scheduledTime: taskData.scheduledTime || '19:00:00',
          repeatCount: taskData.repeatCount !== undefined ? taskData.repeatCount : '' // 编辑时保留原值，新增时为空
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
  
  // 打开文件选择弹窗
  const openFileModal = () => {
    setShowFileModal(true);
    // 设置当前选中的文件为已选择的文件（通过文件名匹配）
    // 注意：这里不再依赖 availableFiles，而是由 FileSelectorModal 内部管理
  };
  
  // 关闭文件选择弹窗
  const closeFileModal = () => {
    setShowFileModal(false);
  };
  
  // 选中文件（单选）
  const selectFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };
  
  // 确认选择文件（接收子组件传递的真实文件对象）
  const confirmFileSelection = (selectedFile: any) => {
    if (selectedFile) {
      setScheduleData({
        ...scheduleData,
        fileName: selectedFile.name, // 原始文件名，用于数据传输
        displayName: selectedFile.displayName, // 展示用文件名
        filePath: selectedFile.path || '' // 硬件文件可能没有本地路径
      });
      closeFileModal();
    } else {
      Taro.showToast({
        title: '请先选择一个文件',
        icon: 'none'
      });
    }
  };
  
  const { selectedDays } = scheduleData;
  
  return (
    <View className="schedule-edit-page">
      <View className="content">
        <View className="form-item">
          <Text className="label">音频</Text>
          <View className="file-picker" onClick={openFileModal}>
            {scheduleData.displayName || '请选择文件'}
            <Text className="arrow-icon">›</Text>
          </View>
        </View>
        
        <View className="form-item vertical">
          <Text className="label">星期选择</Text>
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
        
        {/* 播放模式选择 */}
        <View className="form-item vertical">
          <Text className="label">播放模式</Text>
          <View className="mode-selector">
            <View 
              className={`mode-btn ${scheduleData.playMode === PlayMode.LOOP ? 'active' : ''}`}
              onClick={() => setScheduleData({...scheduleData, playMode: PlayMode.LOOP})}
            >
              循环播放
            </View>
            <View 
              className={`mode-btn ${scheduleData.playMode === PlayMode.SENSOR ? 'active' : ''}`}
              onClick={() => setScheduleData({...scheduleData, playMode: PlayMode.SENSOR})}
            >
              感应播放
            </View>
            <View 
              className={`mode-btn ${scheduleData.playMode === PlayMode.SCHEDULED ? 'active' : ''}`}
              onClick={() => setScheduleData({...scheduleData, playMode: PlayMode.SCHEDULED})}
            >
              到点播放
            </View>
          </View>
        </View>
        
        {/* 循环/感应模式：显示循环周期和时间范围 */}
        {(scheduleData.playMode === PlayMode.LOOP || scheduleData.playMode === PlayMode.SENSOR) && (
          <>
            {/* 循环周期 */}
            <View className="form-item vertical">
              <Text className="label">循环周期</Text>
              <View className="interval-picker">
                <Picker 
                  mode="selector" 
                  range={Array.from({length: 60}, (_, i) => i)}
                  value={scheduleData.intervalMinutes}
                  onChange={(e) => setScheduleData({...scheduleData, intervalMinutes: Number(e.detail.value)})}
                >
                  <View className="picker-value">
                    {scheduleData.intervalMinutes.toString().padStart(2, '0')}
                    <Text className="arrow-icon">›</Text>
                  </View>
                </Picker>
                <Text className="unit">分钟</Text>
                <Picker 
                  mode="selector" 
                  range={Array.from({length: 60}, (_, i) => i)}
                  value={scheduleData.intervalSeconds}
                  onChange={(e) => setScheduleData({...scheduleData, intervalSeconds: Number(e.detail.value)})}
                >
                  <View className="picker-value">
                    {scheduleData.intervalSeconds.toString().padStart(2, '0')}
                    <Text className="arrow-icon">›</Text>
                  </View>
                </Picker>
                <Text className="unit">秒</Text>
              </View>
            </View>
            
            {/* 时间范围 */}
            <View className="form-item vertical">
              <Text className="label">时间范围</Text>
              <View className="time-range-selector">
                <View 
                  className={`range-btn ${scheduleData.startTime === '00:00' && scheduleData.endTime === '23:59' ? 'active' : ''}`}
                  onClick={() => setScheduleData({...scheduleData, startTime: '00:00', endTime: '23:59'})}
                >
                  全天
                </View>
                <View 
                  className={`range-btn ${!(scheduleData.startTime === '00:00' && scheduleData.endTime === '23:59') ? 'active' : ''}`}
                  onClick={() => {
                    // 如果不是全天，设置为默认时间段
                    if (scheduleData.startTime === '00:00' && scheduleData.endTime === '23:59') {
                      setScheduleData({...scheduleData, startTime: '19:00', endTime: '20:00'});
                    }
                  }}
                >
                  时间段
                </View>
              </View>
            </View>
            
            {/* 时间段选择（仅当不是全天时显示） */}
            {!(scheduleData.startTime === '00:00' && scheduleData.endTime === '23:59') && (
              <>
                <View className="form-item">
                  <Text className="label">开始时间</Text>
                  <Picker 
                    mode="time" 
                    value={scheduleData.startTime} 
                    onChange={(e) => setScheduleData({...scheduleData, startTime: e.detail.value})}
                  >
                    <View className="time-picker">
                      {scheduleData.startTime}
                    </View>
                  </Picker>
                </View>
                
                <View className="form-item">
                  <Text className="label">结束时间</Text>
                  <Picker 
                    mode="time" 
                    value={scheduleData.endTime} 
                    onChange={(e) => setScheduleData({...scheduleData, endTime: e.detail.value})}
                  >
                    <View className="time-picker">
                      {scheduleData.endTime}
                    </View>
                  </Picker>
                </View>
              </>
            )}
          </>
        )}
        
        {/* 到点播放模式：显示播放时间和重复次数 */}
        {scheduleData.playMode === PlayMode.SCHEDULED && (
          <>
            <View className="form-item vertical">
              <Text className="label">播放时间</Text>
              <Picker 
                mode="time" 
                value={scheduleData.scheduledTime} 
                onChange={(e) => setScheduleData({...scheduleData, scheduledTime: e.detail.value})}
              >
                <View className="time-picker">
                  {scheduleData.scheduledTime}
                </View>
              </Picker>
            </View>
            
            <View className="form-item vertical">
              <Text className="label">重复次数</Text>
              <Input 
                type="number"
                value={scheduleData.repeatCount === '' ? '' : String(scheduleData.repeatCount)}
                placeholder="请输入重复次数（默认1次）"
                onInput={(e) => {
                  const value = e.detail.value;
                  // 允许空字符串
                  if (value === '') {
                    setScheduleData({...scheduleData, repeatCount: ''});
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (numValue >= 1 && numValue <= 999) {
                    setScheduleData({...scheduleData, repeatCount: numValue});
                  }
                }}
                onBlur={(e) => {
                  const value = e.detail.value;
                  // 如果为空或无效，保持为空（确定时会处理）
                  if (value === '') {
                    return;
                  }
                  
                  const numValue = Number(value);
                  if (!numValue || numValue < 1) {
                    setScheduleData({...scheduleData, repeatCount: 1});
                  } else if (numValue > 999) {
                    setScheduleData({...scheduleData, repeatCount: 999});
                  }
                }}
              />
            </View>
            
            <View className="form-item vertical">
              <Text className="label">间隔时间</Text>
              <View className="interval-picker">
                <Picker 
                  mode="selector" 
                  range={Array.from({length: 60}, (_, i) => i)}
                  value={scheduleData.intervalMinutes}
                  onChange={(e) => setScheduleData({...scheduleData, intervalMinutes: Number(e.detail.value)})}
                >
                  <View className="picker-value">
                    {scheduleData.intervalMinutes.toString().padStart(2, '0')}
                    <Text className="arrow-icon">›</Text>
                  </View>
                </Picker>
                <Text className="unit">分钟</Text>
                <Picker 
                  mode="selector" 
                  range={Array.from({length: 60}, (_, i) => i)}
                  value={scheduleData.intervalSeconds}
                  onChange={(e) => setScheduleData({...scheduleData, intervalSeconds: Number(e.detail.value)})}
                >
                  <View className="picker-value">
                    {scheduleData.intervalSeconds.toString().padStart(2, '0')}
                    <Text className="arrow-icon">›</Text>
                  </View>
                </Picker>
                <Text className="unit">秒</Text>
              </View>
            </View>
          </>
        )}
      </View>
      
      {/* 文件选择弹窗 */}
      <FileSelectorModal
        visible={showFileModal}
        selectedFileId={selectedFileId}
        onSelect={selectFile}
        onConfirm={confirmFileSelection}
        onCancel={closeFileModal}
      />
      
      <View className="bottom-button-container">
        <Button 
          className="confirm-button" 
          onClick={() => {
            console.log('确定按钮点击', Taro.eventCenter);
            
            // 校验：必须选择音频文件
            // if (!scheduleData.fileName || scheduleData.fileName.trim() === '') {
            //   Taro.showToast({
            //     title: '请选择音频文件',
            //     icon: 'none',
            //     duration: 2000
            //   });
            //   return;
            // }
            
            // 校验：至少选择一天
            if (scheduleData.selectedDays.length === 0) {
              Taro.showToast({
                title: '请至少选择一天',
                icon: 'none',
                duration: 2000
              });
              return;
            }
            
            // 校验：循环/感应模式下，开始时间必须小于结束时间（不允许跨天）
            if (scheduleData.playMode !== PlayMode.SCHEDULED && !(scheduleData.startTime === '00:00' && scheduleData.endTime === '23:59')) {
              const [startHour, startMinute] = scheduleData.startTime.split(':').map(Number);
              const [endHour, endMinute] = scheduleData.endTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMinute;
              const endMinutes = endHour * 60 + endMinute;
              
              if (startMinutes >= endMinutes) {
                Taro.showToast({
                  title: '开始时间必须小于结束时间',
                  icon: 'none',
                  duration: 2000
                });
                return;
              }
            }
            
            // 计算循环周期（秒数）
            const intervalInSeconds = scheduleData.intervalMinutes * 60 + scheduleData.intervalSeconds;
            
            // 构造任务数据
            let taskData: any = {
              id: taskId,
              fileName: scheduleData.fileName,
              displayName: scheduleData.displayName,
              filePath: scheduleData.filePath,
              selectedDays: scheduleData.selectedDays,
              playMode: scheduleData.playMode
            };
            
            // 根据播放模式添加对应字段
            if (scheduleData.playMode === PlayMode.SCHEDULED) {
              // 到点播放模式：保留播放时间、重复次数和间隔时间
              taskData.scheduledTime = scheduleData.scheduledTime;
              // 如果重复次数为空，默认为1
              taskData.repeatCount = scheduleData.repeatCount === '' ? 1 : scheduleData.repeatCount;
              taskData.interval = intervalInSeconds; // 到点播放也使用间隔时间
              // 清除时间范围
              taskData.startTime = null;
              taskData.endTime = null;
            } else {
              // 循环/感应模式：保留时间范围和循环周期
              taskData.interval = intervalInSeconds; // 统一为秒数
              taskData.startTime = scheduleData.startTime;
              taskData.endTime = scheduleData.endTime;
              // 清除到点播放相关字段
              taskData.scheduledTime = null;
              taskData.repeatCount = null;
            }
            console.log('taskData --- ', taskData)
            // 根据是编辑模式还是新增模式执行不同操作
            if (isEditing) {
              // 编辑模式：更新现有任务
              Taro.eventCenter.trigger('updateTask', taskData);
            } else {
              // 新增模式：添加新任务
              Taro.eventCenter.trigger('addNewTask', taskData);
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