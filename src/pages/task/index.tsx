import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { useReachBottom, navigateTo } from '@tarojs/taro'
import TaskTabs from '@/pages/task/components/TaskTabs'
import TaskItem from '@/pages/task/components/TaskItem'
import IntervalItem from '@/pages/task/components/IntervalItem'
import './index.scss'

// 定义任务接口，与定时编辑页保持一致
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

// 定义循环播放任务接口
interface IntervalTask {
  id: string;
  taskName: string;
  fileName: string;
  filePath: string;
  volume: number;
  relayEnabled: boolean;
  interval: number;
  isEnabled: boolean;
}

const TaskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'loop'>('schedule');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [intervalTasks, setIntervalTasks] = useState<IntervalTask[]>([]);
  
  // 第一次进入定时播放tab时获取任务列表
  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchTasks();
    } else if (activeTab === 'loop') {
      fetchIntervalTasks();
    }
  }, [activeTab]);
  
  const fetchTasks = async () => {
    // 这里应该从API或本地存储获取任务列表
    // 为了演示，我们使用模拟数据
    const mockTasks: Task[] = [
      {
        id: '1',
        taskName: '编号 1',
        fileName: '音频1.mp3',
        filePath: '/path/to/audio1.mp3',
        selectedDays: ['一', '二', '三', '四', '五'],
        volume: 15,
        relayEnabled: false,
        startTime: '09:00',
        endTime: '12:00',
        isEnabled: true
      },
      {
        id: '2',
        taskName: '编号 2',
        fileName: '音频2.mp3',
        filePath: '/path/to/audio2.mp3',
        selectedDays: ['一', '二', '三', '四', '五', '六', '日'],
        volume: 15,
        relayEnabled: false,
        startTime: '13:30',
        endTime: '20:30',
        isEnabled: true
      }
    ];
    setTasks(mockTasks);
  };
  
  const fetchIntervalTasks = async () => {
    // 这里应该从API或本地存储获取循环播放任务列表
    // 为了演示，我们使用模拟数据
    const mockIntervalTasks: IntervalTask[] = [
      {
        id: '101',
        taskName: '循环播放任务 1',
        fileName: '音频A.mp3',
        filePath: '/path/to/audioA.mp3',
        volume: 20,
        relayEnabled: true,
        interval: 10,
        isEnabled: true
      }
    ];
    setIntervalTasks(mockIntervalTasks);
  };
  
  useReachBottom(() => {
    console.log('reach task page bottom')
  })

  return (
    <View className="task-page">
      <TaskTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      <View className="content">
        {activeTab === 'schedule' ? (
          <View className="schedule-list">
            {tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onEdit={(taskId) => {
                  navigateTo({
                    url: `/pages/task/schedule-edit/index?id=${taskId}`
                  });
                }} 
                onToggleEnable={(taskId, isEnabled) => {
                  setTasks(prevTasks => 
                    prevTasks.map(t => 
                      t.id === taskId ? {...t, isEnabled} : t
                    )
                  );
                }}
              />
            ))}
          </View>
        ) : (
          <View className="schedule-list">
            {intervalTasks.map(task => (
              <IntervalItem 
                key={task.id} 
                task={task} 
                onEdit={(taskId) => {
                  navigateTo({
                    url: `/pages/task/interval-play/index?id=${taskId}`
                  });
                }} 
                onToggleEnable={(taskId, isEnabled) => {
                  setIntervalTasks(prevTasks => 
                    prevTasks.map(t => 
                      t.id === taskId ? {...t, isEnabled} : t
                    )
                  );
                }}
              />
            ))}
          </View>
        )}
      </View>
      <View className="bottom-button-container">
        <Button 
          className="bottom-button send-to-device" 
          onClick={() => {
            if(activeTab === 'schedule') {
              // 跳转到定时播放编辑页面
              navigateTo({
                url: '/pages/task/schedule-edit/index'
              });
            } else {
              // 循环播放的新增任务逻辑 - 跳转到间隔播放页面
              navigateTo({
                url: '/pages/task/interval-play/index'
              });
            }
          }}
        >
          +新增任务
        </Button>
        <Button 
          className="bottom-button preview" 
          onClick={() => {
            console.log('设置同步');
          }}
        >
          设置同步
        </Button>
      </View>
    </View>
  )
}

export default TaskPage