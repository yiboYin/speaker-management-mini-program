import React from 'react';
import { View, Text, Switch, Button } from '@tarojs/components';
import './TaskItem.scss';

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
  isEnabled: boolean;
}

interface TaskItemProps {
  task: Task;
  onEdit: (taskId: string) => void;
  onToggleEnable: (taskId: string, isEnabled: boolean) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onToggleEnable }) => {
  const formatDays = (days: string[]) => {
    if (days.length === 0) return '无';
    return days.map(day => `周${day}`).join('、');
  };

  return (
    <View className="task-item">
      <View className="header">
        <Text className="task-name">{task.taskName || '未命名任务'}</Text>
        <Button 
          className="edit-btn" 
          size="mini" 
          onClick={() => onEdit(task.id)}
        >
          编辑
        </Button>
      </View>
      
      <View className="detail-row">
        <Text className="label">时间</Text>
        <Text className="value">{task.startTime} - {task.endTime}</Text>
      </View>
      
      <View className="detail-row">
        <Text className="label">重复</Text>
        <View className="days-container">
          {task.selectedDays.map(day => (
            <Text key={day} className="day-tag">{`周${day}`}</Text>
          ))}
        </View>
      </View>
      
      <View className="volume-relay-row">
        <Text className="label">音量</Text>
        <Text className="value">{task.volume}</Text>
        <Text className="label">继电器</Text>
        <Text className="value">{task.relayEnabled ? '开' : '关'}</Text>
      </View>
      
      <View className="detail-row">
        <Text className="label">音频</Text>
        <Text className="value">{task.fileName || '未选择文件'}</Text>
      </View>
      
      <View className="detail-row">
        <Text className="label">是否启用</Text>
        <Switch 
          checked={task.isEnabled} 
          onChange={(e) => onToggleEnable(task.id, e.detail.value)}
        />
      </View>
    </View>
  );
};

export default TaskItem;