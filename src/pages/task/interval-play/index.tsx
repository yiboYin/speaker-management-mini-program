import React, { useState, useEffect } from 'react';
import { View, Text, Button, Slider, Switch, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import FileSelectorModal from '@/components/FileSelectorModal';
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
  
  // 文件选择弹窗相关状态
  const [showFileModal, setShowFileModal] = useState(false); // 是否显示文件选择弹窗
  const [selectedFileId, setSelectedFileId] = useState<string>(''); // 当前选中的文件ID
  
  // 定义备选文件列表（模拟从导入页面获取）
  const availableFiles = [
    { id: 'file_1', name: '0001.mp3', path: '/path/to/audio1.mp3', duration: '00:30' },
    { id: 'file_2', name: '0002.mp3', path: '/path/to/audio2.mp3', duration: '00:45' },
    { id: 'file_3', name: '0003.mp3', path: '/path/to/audio3.mp3', duration: '01:00' },
    { id: 'file_4', name: '0004.mp3', path: '/path/to/audio4.mp3', duration: '00:20' }
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
    volume: 3, // 默认音量为3（0-5范围）
    relayEnabled: false,
    interval: 5
  });
  
  // 初始化时设置默认选中文件
  useEffect(() => {
    if (availableFiles.length > 0) {
      setSelectedFileId(availableFiles[0].id);
    }
  }, []);
  
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
  
  // 打开文件选择弹窗
  const openFileModal = () => {
    setShowFileModal(true);
    // 设置当前选中的文件为已选择的文件
    const currentFile = availableFiles.find(f => f.name === playData.fileName);
    if (currentFile) {
      setSelectedFileId(currentFile.id);
    }
  };
  
  // 关闭文件选择弹窗
  const closeFileModal = () => {
    setShowFileModal(false);
  };
  
  // 选中文件（单选）
  const selectFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };
  
  // 确认选择文件
  const confirmFileSelection = () => {
    const selectedFile = availableFiles.find(f => f.id === selectedFileId);
    if (selectedFile) {
      setPlayData({
        ...playData,
        fileName: selectedFile.name,
        filePath: selectedFile.path
      });
      closeFileModal();
      Taro.showToast({
        title: '已选择文件',
        icon: 'success'
      });
    }
  };

  return (
    <View className="interval-play-page">
      <View className="content">
        <View className="form-item">
          <Text className="label">音频</Text>
          <View className="file-picker" onClick={openFileModal}>
            {playData.fileName || '请选择文件'}
            <Text className="arrow-icon">›</Text>
          </View>
        </View>
        
        <View className="form-item">
          <Text className="label">音量</Text>
          <View className="slider-container">
            <Slider 
              value={volume} 
              min={0} 
              max={5} 
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