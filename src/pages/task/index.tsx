import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useReachBottom, navigateTo, eventCenter } from '@tarojs/taro'
import { sendCommandToDevice } from '@/utils/deviceUtils';
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
  
  // 删除定时任务
  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };
  
  // 删除间隔任务
  const deleteIntervalTask = (taskId: string) => {
    setIntervalTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };
  
  // 监听来自编辑页面的事件
  useEffect(() => {
    // 监听定时任务更新事件
    Taro.eventCenter.on('updateTask', (updatedTask) => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
      );
    });
    
    // 监听新增定时任务事件
    Taro.eventCenter.on('addNewTask', (newTask) => {
      // 生成唯一ID
      const newTaskWithId = {
        ...newTask,
        id: Date.now().toString(),
        isEnabled: true // 新增任务默认启用
      };
      // 在最上方插入新任务
      setTasks(prevTasks => [newTaskWithId, ...prevTasks]);
    });
    
    // 监听间隔任务更新事件
    Taro.eventCenter.on('updateIntervalTask', (updatedTask) => {
      setIntervalTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
      );
    });
    
    // 监听新增间隔任务事件
    Taro.eventCenter.on('addNewIntervalTask', (newTask) => {
      // 生成唯一ID
      const newTaskWithId = {
        ...newTask,
        id: (Date.now() + Math.random()).toString(),
        isEnabled: true // 新增任务默认启用
      };
      // 在最上方插入新任务
      setIntervalTasks(prevTasks => [newTaskWithId, ...prevTasks]);
    });
    
    // 清理事件监听器
    return () => {
      Taro.eventCenter.off('updateTask');
      Taro.eventCenter.off('addNewTask');
      Taro.eventCenter.off('updateIntervalTask');
      Taro.eventCenter.off('addNewIntervalTask');
    };
  }, []);
  
  // 第一次进入定时播放tab时获取任务列表
  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchTasks();
    } else if (activeTab === 'loop') {
      fetchIntervalTasks();
    }
  }, [activeTab]);
  
  const fetchTasks = async () => {
    // 从设备获取定时任务列表
    try {
      await sendCommandToDevice('7E 02 42 EF', (data) => {
        console.log('获取定时任务返回数据:', data);
        
        // 解析设备返回的任务数据
        // 返回格式: 7E 02 43 [数量] [任务1] [任务2]... EF
        if (data.resValue && data.resValue.length >= 3) {
          const taskCount = data.resValue[2]; // 任务数量在第3个字节
          console.log(`检测到设备上有 ${taskCount} 个定时任务`);
          
          const fetchedTasks: Task[] = [];
          let currentIndex = 3; // 从第4个字节开始是任务信息
          
          for (let i = 0; i < taskCount; i++) {
            if (currentIndex >= data.resValue.length) break;
            
            // 解析任务数据格式: [ID长度][ID][文件ID][音量][继电器][开始时间][结束时间][星期几][启用状态]
            const idLength = data.resValue[currentIndex];
            currentIndex++;
            
            if (currentIndex + idLength >= data.resValue.length) break;
            
            // 提取任务ID（UTF-8编码）
            const idBytes = data.resValue.slice(currentIndex, currentIndex + idLength);
            const decoder = new TextDecoder('utf-8');
            const id = decoder.decode(new Uint8Array(idBytes));
            currentIndex += idLength;
            
            if (currentIndex + 7 >= data.resValue.length) break;
            
            const fileId = data.resValue[currentIndex];
            currentIndex++;
            
            const volume = data.resValue[currentIndex];
            currentIndex++;
            
            const relayEnabled = data.resValue[currentIndex] === 0x01;
            currentIndex++;
            
            // 开始时间是2字节（大端序）
            const startTimeMinutes = (data.resValue[currentIndex] << 8) | data.resValue[currentIndex + 1];
            currentIndex += 2;
            
            // 结束时间是2字节（大端序）
            const endTimeMinutes = (data.resValue[currentIndex] << 8) | data.resValue[currentIndex + 1];
            currentIndex += 2;
            
            // 星期几是1字节（位掩码）
            const daysMask = data.resValue[currentIndex];
            currentIndex++;
            
            const isEnabled = data.resValue[currentIndex] === 0x01;
            currentIndex++;
            
            // 根据位掩码解析星期几
            const selectedDays = [];
            if (daysMask & 0x01) selectedDays.push('日'); // bit0: 周日
            if (daysMask & 0x02) selectedDays.push('一'); // bit1: 周一
            if (daysMask & 0x04) selectedDays.push('二'); // bit2: 周二
            if (daysMask & 0x08) selectedDays.push('三'); // bit3: 周三
            if (daysMask & 0x10) selectedDays.push('四'); // bit4: 周四
            if (daysMask & 0x20) selectedDays.push('五'); // bit5: 周五
            if (daysMask & 0x40) selectedDays.push('六'); // bit6: 周六
            
            // 将分钟数转换为HH:MM格式
            const startTime = `${Math.floor(startTimeMinutes / 60).toString().padStart(2, '0')}:${(startTimeMinutes % 60).toString().padStart(2, '0')}`;
            const endTime = `${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}`;
            
            // 根据文件ID获取文件名，这里使用占位符
            const fileName = `音频${fileId}.mp3`;
            const filePath = `/path/to/audio${fileId}.mp3`;
            
            fetchedTasks.push({
              id,
              taskName: `任务 ${id}`,
              fileName,
              filePath,
              selectedDays,
              volume,
              relayEnabled,
              startTime,
              endTime,
              isEnabled
            });
          }
          
          setTasks(fetchedTasks);
          console.log('更新后的定时任务列表:', fetchedTasks);
        }
      });
    } catch (error) {
      console.error('获取定时任务失败:', error);
      // 如果获取设备任务失败，仍然可以使用空数组
      setTasks([]);
    }
  };
  
  const fetchIntervalTasks = async () => {
    // 从设备获取循环播放任务列表
    try {
      await sendCommandToDevice('7E 02 51 EF', (data) => {
        console.log('获取循环任务返回数据:', data);
        
        // 解析设备返回的循环任务数据
        // 返回格式: 7E 02 52 [数量] [任务1] [任务2]... EF
        if (data.resValue && data.resValue.length >= 3) {
          const taskCount = data.resValue[2]; // 任务数量在第3个字节
          console.log(`检测到设备上有 ${taskCount} 个循环任务`);
          
          const fetchedIntervalTasks: IntervalTask[] = [];
          let currentIndex = 3; // 从第4个字节开始是任务信息
          
          for (let i = 0; i < taskCount; i++) {
            if (currentIndex >= data.resValue.length) break;
            
            // 解析循环任务数据格式: [ID长度][ID][文件ID][音量][继电器][间隔时间][启用状态]
            const idLength = data.resValue[currentIndex];
            currentIndex++;
            
            if (currentIndex + idLength >= data.resValue.length) break;
            
            // 提取任务ID（UTF-8编码）
            const idBytes = data.resValue.slice(currentIndex, currentIndex + idLength);
            const decoder = new TextDecoder('utf-8');
            const id = decoder.decode(new Uint8Array(idBytes));
            currentIndex += idLength;
            
            if (currentIndex + 5 >= data.resValue.length) break;
            
            const fileId = data.resValue[currentIndex];
            currentIndex++;
            
            const volume = data.resValue[currentIndex];
            currentIndex++;
            
            const relayEnabled = data.resValue[currentIndex] === 0x01;
            currentIndex++;
            
            const interval = data.resValue[currentIndex];
            currentIndex++;
            
            const isEnabled = data.resValue[currentIndex] === 0x01;
            currentIndex++;
            
            // 根据文件ID获取文件名，这里使用占位符
            const fileName = `音频${fileId}.mp3`;
            const filePath = `/path/to/audio${fileId}.mp3`;
            
            fetchedIntervalTasks.push({
              id,
              taskName: `循环任务 ${id}`,
              fileName,
              filePath,
              volume,
              relayEnabled,
              interval,
              isEnabled
            });
          }
          
          setIntervalTasks(fetchedIntervalTasks);
          console.log('更新后的循环任务列表:', fetchedIntervalTasks);
        }
      });
    } catch (error) {
      console.error('获取循环任务失败:', error);
      // 如果获取设备任务失败，仍然可以使用空数组
      setIntervalTasks([]);
    }
  };
  
  // 同步任务到设备
  const syncTasksToDevice = async () => {
    try {
      // 同步定时任务
      if (tasks.length > 0) {
        // 构造批量更新定时任务的指令
        // 格式: 7E 02 40 [数量] [任务1] [任务2]... EF
        
        let command = '7E 02 40 ' + tasks.length.toString(16).padStart(2, '0');
        
        for (const task of tasks) {
          // 构造每个任务的数据
          // [ID长度][ID][文件ID][音量][继电器][开始时间][结束时间][启用状态]
          
          // 计算ID长度和ID的十六进制表示
          const encoder = new TextEncoder();
          const idBytes = encoder.encode(task.id);
          const idLength = idBytes.length;
          const idHex = Array.from(idBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          // 解析时间字符串为分钟数
          const [startHour, startMinute] = task.startTime.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;
          const startTimeHex = [(startTimeMinutes >> 8) & 0xFF, startTimeMinutes & 0xFF]
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          const [endHour, endMinute] = task.endTime.split(':').map(Number);
          const endTimeMinutes = endHour * 60 + endMinute;
          const endTimeHex = [(endTimeMinutes >> 8) & 0xFF, endTimeMinutes & 0xFF]
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          // 从文件路径解析文件ID
          const fileId = parseInt(task.filePath.match(/\d+/)?.[0] || '1');
          
          // 计算星期几位掩码
          let daysMask = 0;
          if (task.selectedDays.includes('日')) daysMask |= 0x01; // 周日
          if (task.selectedDays.includes('一')) daysMask |= 0x02; // 周一
          if (task.selectedDays.includes('二')) daysMask |= 0x04; // 周二
          if (task.selectedDays.includes('三')) daysMask |= 0x08; // 周三
          if (task.selectedDays.includes('四')) daysMask |= 0x10; // 周四
          if (task.selectedDays.includes('五')) daysMask |= 0x20; // 周五
          if (task.selectedDays.includes('六')) daysMask |= 0x40; // 周六
          
          // 构造任务数据
          const taskData = [
            idLength.toString(16).padStart(2, '0'),  // ID长度
            idHex,                                     // ID
            fileId.toString(16).padStart(2, '0'),      // 文件ID
            task.volume.toString(16).padStart(2, '0'), // 音量
            (task.relayEnabled ? 0x01 : 0x00).toString(16).padStart(2, '0'), // 继电器
            startTimeHex,                              // 开始时间
            endTimeHex,                                // 结束时间
            daysMask.toString(16).padStart(2, '0'),    // 星期几
            (task.isEnabled ? 0x01 : 0x00).toString(16).padStart(2, '0')     // 启用状态
          ].join(' ');
          
          command += ' ' + taskData;
        }
        
        command += ' EF';
        
        console.log('发送定时任务同步指令:', command);
        
        await sendCommandToDevice(command, (data) => {
          console.log('定时任务同步响应:', data);
          
          // 检查响应是否成功
          if (data.resValue && data.resValue.length >= 4) {
            const responseCmd = data.resValue[1]; // 应答命令码
            const result = data.resValue[3]; // 结果 01=成功, 00=失败
            
            if (responseCmd === 0x43 && result === 0x01) {
              Taro.showToast({
                title: '定时任务同步成功',
                icon: 'success',
                duration: 2000
              });
            } else {
              Taro.showToast({
                title: '定时任务同步失败',
                icon: 'none',
                duration: 2000
              });
            }
          }
        });
      }
      
      // 同步循环任务
      if (intervalTasks.length > 0) {
        // 构造批量更新循环任务的指令
        // 格式: 7E 02 50 [数量] [任务1] [任务2]... EF
        
        let intervalCommand = '7E 02 50 ' + intervalTasks.length.toString(16).padStart(2, '0');
        
        for (const task of intervalTasks) {
          // 构造每个循环任务的数据
          // [ID长度][ID][文件ID][音量][继电器][间隔时间][启用状态]
          
          // 计算ID长度和ID的十六进制表示
          const encoder = new TextEncoder();
          const idBytes = encoder.encode(task.id);
          const idLength = idBytes.length;
          const idHex = Array.from(idBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          // 从文件路径解析文件ID
          const fileId = parseInt(task.filePath.match(/\d+/)?.[0] || '1');
          
          // 构造任务数据
          const taskData = [
            idLength.toString(16).padStart(2, '0'),  // ID长度
            idHex,                                     // ID
            fileId.toString(16).padStart(2, '0'),      // 文件ID
            task.volume.toString(16).padStart(2, '0'), // 音量
            (task.relayEnabled ? 0x01 : 0x00).toString(16).padStart(2, '0'), // 继电器
            task.interval.toString(16).padStart(2, '0'),                   // 间隔时间
            (task.isEnabled ? 0x01 : 0x00).toString(16).padStart(2, '0')     // 启用状态
          ].join(' ');
          
          intervalCommand += ' ' + taskData;
        }
        
        intervalCommand += ' EF';
        
        console.log('发送循环任务同步指令:', intervalCommand);
        
        await sendCommandToDevice(intervalCommand, (data) => {
          console.log('循环任务同步响应:', data);
          
          // 检查响应是否成功
          if (data.resValue && data.resValue.length >= 4) {
            const responseCmd = data.resValue[1]; // 应答命令码
            const result = data.resValue[3]; // 结果 01=成功, 00=失败
            
            if (responseCmd === 0x53 && result === 0x01) {
              Taro.showToast({
                title: '循环任务同步成功',
                icon: 'success',
                duration: 2000
              });
            } else {
              Taro.showToast({
                title: '循环任务同步失败',
                icon: 'none',
                duration: 2000
              });
            }
          }
        });
      }
      
      if (tasks.length === 0 && intervalTasks.length === 0) {
        Taro.showToast({
          title: '没有任务需要同步',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('同步任务到设备失败:', error);
      Taro.showToast({
        title: '同步任务失败',
        icon: 'none',
        duration: 2000
      });
    }
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
                  // 获取完整的任务数据并序列化
                  const taskData = tasks.find(t => t.id === taskId);
                  if (taskData) {
                    const serializedData = encodeURIComponent(JSON.stringify(taskData));
                    navigateTo({
                      url: `/pages/task/schedule-edit/index?data=${serializedData}`
                    });
                  }
                }} 
                onToggleEnable={(taskId, isEnabled) => {
                  setTasks(prevTasks => 
                    prevTasks.map(t => 
                      t.id === taskId ? {...t, isEnabled} : t
                    )
                  );
                }}
                onDelete={deleteTask}
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
                  // 获取完整的任务数据并序列化
                  const taskData = intervalTasks.find(t => t.id === taskId);
                  if (taskData) {
                    const serializedData = encodeURIComponent(JSON.stringify(taskData));
                    navigateTo({
                      url: `/pages/task/interval-play/index?data=${serializedData}`
                    });
                  }
                }} 
                onToggleEnable={(taskId, isEnabled) => {
                  setIntervalTasks(prevTasks => 
                    prevTasks.map(t => 
                      t.id === taskId ? {...t, isEnabled} : t
                    )
                  );
                }}
                onDelete={deleteIntervalTask}
              />
            ))}
          </View>
        )}
      </View>
      <View className="bottom-button-container">
        <Button 
          className="bottom-button send-to-device" 
          disabled={activeTab === 'loop' && intervalTasks.length > 0} // 当处于循环播放tab且有任务时禁用新增按钮
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
          onClick={async () => {
            // 同步任务到设备
            await syncTasksToDevice();
          }}
        >
          设置同步
        </Button>
      </View>
    </View>
  )
}

export default TaskPage