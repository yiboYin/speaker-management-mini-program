import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import './TaskTabs.scss';

interface TaskTabsProps {
  activeTab: 'schedule' | 'loop';
  onTabChange: (tab: 'schedule' | 'loop') => void;
}

const TaskTabs: React.FC<TaskTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View className="task-tabs">
      <View 
        className={`tab-item ${activeTab === 'schedule' ? 'active' : ''}`} 
        onClick={() => onTabChange('schedule')}
      >
        <Text>定时播放</Text>
      </View>
      <View 
        className={`tab-item ${activeTab === 'loop' ? 'active' : ''}`} 
        onClick={() => onTabChange('loop')}
      >
        <Text>循环播放</Text>
      </View>
    </View>
  );
};

export default TaskTabs;