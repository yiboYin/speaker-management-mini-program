import React from 'react';
import { View, Text, Switch, Button } from '@tarojs/components';
import './TaskItem.scss'; // 复用现有样式

interface IntervalTask {
  id: string;
  taskName: string;
  fileName: string;
  filePath: string;
  volume: number;
  relayEnabled: boolean;
  interval: number; // 间隔（秒）
  isEnabled: boolean;
}

interface IntervalItemProps {
  task: IntervalTask;
  onEdit: (taskId: string) => void;
}

const IntervalItem: React.FC<IntervalItemProps> = ({ task, onEdit }) => {
  return (
    <View className="task-item">
      <View className="header">
        <Text className="task-name">间隔播放</Text>
        <Button 
          className="edit-btn" 
          size="mini" 
          onClick={() => onEdit(task.id)}
        >
          编辑
        </Button>
      </View>
      
      <View className="detail-row">
        <Text className="label">音频</Text>
        <Text className="value">{task.fileName || '未选择文件'}</Text>
      </View>
      
      <View className="volume-relay-row">
        <Text className="label">音量</Text>
        <Text className="value">{task.volume}</Text>
        <Text className="label">继电器</Text>
        <Text className="value">{task.relayEnabled ? '开' : '关'}</Text>
      </View>
      
      <View className="detail-row">
        <Text className="label">间隔（秒）</Text>
        <Text className="value">{task.interval}</Text>
      </View>
    </View>
  );
};

export default IntervalItem;