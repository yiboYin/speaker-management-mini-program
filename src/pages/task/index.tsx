import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useReachBottom, navigateTo, eventCenter } from '@tarojs/taro'
import { sendCommandToDevice } from '@/utils/deviceUtils';
import { TASK_COMMANDS, RESPONSE_CODES, RESULT_CODES } from '@/constants/bluetoothCommands';
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
      // 生成唯一ID和任务名称
      const newId = Date.now().toString();
      const taskCount = tasks.length + 1;
      const newTaskWithId = {
        ...newTask,
        id: newId,
        taskName: `定时任务 ${taskCount}`, // 自动生成任务名称
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
      // 生成唯一ID和任务名称
      const newId = (Date.now() + Math.random()).toString();
      const intervalTaskCount = intervalTasks.length + 1;
      const newTaskWithId = {
        ...newTask,
        id: newId,
        taskName: `循环任务 ${intervalTaskCount}`, // 自动生成任务名称
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
      await sendCommandToDevice(TASK_COMMANDS.GET_SCHEDULE_TASKS, (data) => {
        console.log('获取定时任务返回数据:', data);
        
        // 解析设备返回的任务数据
        // 新协议：一次性返回所有任务数据，用"/"分隔
        // 格式: 7E [整体长度] 02 02 43 [任务数据]
        if (data.resValue && data.resValue.length >= 5) {
          const responseCmd = data.resValue[4]; // 响应命令码（第5个字节）
          
          // 检查是否是任务数据指令（0x43）
          if (responseCmd === RESPONSE_CODES.SCHEDULE_TASK_END) {
            // 从第5个字节开始是任务数据（跳过帧头、长度、方向、固定值、响应码）
            const taskDataBytes = data.resValue.slice(5);
            
            // 将字节数组转换为字符串
            const decoder = new TextDecoder('utf-8');
            const taskDataStr = decoder.decode(new Uint8Array(taskDataBytes));
            
            console.log('任务数据原始字符串:', taskDataStr);
            
            // 按"/"分割任务
            const taskStrings = taskDataStr.split('/').filter(s => s.length > 0);
            
            console.log('解析到的任务数量:', taskStrings.length);
            
            // 解析每个任务
            const newTasks: Task[] = [];
            let taskIdCounter = 1;
            
            for (const taskStr of taskStrings) {
              // 任务信息格式：[文件名][音量][继电器][开始时间][结束时间][星期几][启用状态]
              // 文件名: 4字节
              // 音量: 1字节
              // 继电器: 1字节
              // 开始时间: 2字节（小时+分钟）
              // 结束时间: 2字节（小时+分钟）
              // 星期几: 1字节（位掩码）
              // 启用状态: 1字节
              
              // 将任务字符串转换为字节数组
              const taskBytes: number[] = [];
              for (let i = 0; i < taskStr.length; i++) {
                taskBytes.push(taskStr.charCodeAt(i));
              }
              
              if (taskBytes.length < 12) {
                console.warn('任务数据长度不足，跳过:', taskBytes.length);
                continue;
              }
              
              let currentIndex = 0;
              
              // 文件名（4字节）
              const fileNameBytes = taskBytes.slice(currentIndex, currentIndex + 4);
              const fileNameDecoder = new TextDecoder('utf-8');
              const fileNameWithoutExt = fileNameDecoder.decode(new Uint8Array(fileNameBytes));
              const fileName = `${fileNameWithoutExt}.mp3`;
              currentIndex += 4;
              
              // 音量（1字节）
              const volume = taskBytes[currentIndex];
              currentIndex++;
              
              // 继电器（1字节）
              const relayEnabled = taskBytes[currentIndex] === 0x01;
              currentIndex++;
              
              // 开始时间（2字节：小时+分钟）
              const startHour = taskBytes[currentIndex];
              const startMinute = taskBytes[currentIndex + 1];
              const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
              currentIndex += 2;
              
              // 结束时间（2字节：小时+分钟）
              const endHour = taskBytes[currentIndex];
              const endMinute = taskBytes[currentIndex + 1];
              const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
              currentIndex += 2;
              
              // 星期几（1字节，位掩码）
              const daysMask = taskBytes[currentIndex];
              currentIndex++;
              
              // 启用状态（1字节）
              const isEnabled = taskBytes[currentIndex] === 0x01;
              currentIndex++;
              
              // 根据位掩码解析星期几（bit0=周一，bit6=周日）
              const selectedDays: string[] = [];
              if (daysMask & 0x01) selectedDays.push('一'); // bit0: 周一
              if (daysMask & 0x02) selectedDays.push('二'); // bit1: 周二
              if (daysMask & 0x04) selectedDays.push('三'); // bit2: 周三
              if (daysMask & 0x08) selectedDays.push('四'); // bit3: 周四
              if (daysMask & 0x10) selectedDays.push('五'); // bit4: 周五
              if (daysMask & 0x20) selectedDays.push('六'); // bit5: 周六
              if (daysMask & 0x40) selectedDays.push('日'); // bit6: 周日
              
              // 生成任务ID
              const id = `task_${String(taskIdCounter).padStart(2, '0')}`;
              taskIdCounter++;
              
              newTasks.push({
                id,
                taskName: `定时任务 ${taskIdCounter - 1}`,
                fileName,
                filePath: '', // 硬件文件不需要本地路径
                selectedDays,
                volume,
                relayEnabled,
                startTime,
                endTime,
                isEnabled
              });
            }
            
            console.log('解析到的定时任务:', newTasks);
            setTasks(newTasks);
            
            if (newTasks.length === 0) {
              Taro.showToast({
                title: '暂无定时任务',
                icon: 'none'
              });
            } else {
              Taro.showToast({
                title: `获取到 ${newTasks.length} 个任务`,
                icon: 'success',
                duration: 1500
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('获取定时任务失败:', error);
      setTasks([]);
    }
  };
  
  const fetchIntervalTasks = async () => {
    // 从设备获取循环播放任务列表
    try {
      await sendCommandToDevice(TASK_COMMANDS.GET_INTERVAL_TASKS, (data) => {
        console.log('获取循环任务返回数据:', data);
        
        // 解析设备返回的循环任务数据
        // 新协议：一次性返回所有任务数据，用"/"分隔
        // 格式: 7E [整体长度] 02 02 53 [任务数据]
        if (data.resValue && data.resValue.length >= 5) {
          const responseCmd = data.resValue[4]; // 响应命令码（第5个字节）
          
          // 检查是否是任务数据指令（0x53）
          if (responseCmd === RESPONSE_CODES.INTERVAL_TASK_END) {
            // 从第5个字节开始是任务数据（跳过帧头、长度、方向、固定值、响应码）
            const taskDataBytes = data.resValue.slice(5);
            
            // 将字节数组转换为字符串
            const decoder = new TextDecoder('utf-8');
            const taskDataStr = decoder.decode(new Uint8Array(taskDataBytes));
            
            console.log('任务数据原始字符串:', taskDataStr);
            
            // 按"/"分割任务
            const taskStrings = taskDataStr.split('/').filter(s => s.length > 0);
            
            console.log('解析到的任务数量:', taskStrings.length);
            
            // 解析每个任务
            const newTasks: IntervalTask[] = [];
            let taskIdCounter = 1;
            
            for (const taskStr of taskStrings) {
              // 任务信息格式：[文件名][音量][继电器][间隔时间][启用状态]
              // 文件名: 4字节
              // 音量: 1字节
              // 继电器: 1字节
              // 间隔时间: 1字节
              // 启用状态: 1字节
              
              // 将任务字符串转换为字节数组
              const taskBytes: number[] = [];
              for (let i = 0; i < taskStr.length; i++) {
                taskBytes.push(taskStr.charCodeAt(i));
              }
              
              if (taskBytes.length < 8) {
                console.warn('任务数据长度不足，跳过:', taskBytes.length);
                continue;
              }
              
              let currentIndex = 0;
              
              // 文件名（4字节）
              const fileNameBytes = taskBytes.slice(currentIndex, currentIndex + 4);
              const fileNameDecoder = new TextDecoder('utf-8');
              const fileNameWithoutExt = fileNameDecoder.decode(new Uint8Array(fileNameBytes));
              const fileName = `${fileNameWithoutExt}.mp3`;
              currentIndex += 4;
              
              // 音量（1字节）
              const volume = taskBytes[currentIndex];
              currentIndex++;
              
              // 继电器（1字节）
              const relayEnabled = taskBytes[currentIndex] === 0x01;
              currentIndex++;
              
              // 间隔时间（1字节）
              const interval = taskBytes[currentIndex];
              currentIndex++;
              
              // 启用状态（1字节）
              const isEnabled = taskBytes[currentIndex] === 0x01;
              currentIndex++;
              
              // 生成任务ID
              const id = `interval_${String(taskIdCounter).padStart(2, '0')}`;
              taskIdCounter++;
              
              newTasks.push({
                id,
                taskName: `循环任务 ${taskIdCounter - 1}`,
                fileName,
                filePath: '', // 硬件文件不需要本地路径
                volume,
                relayEnabled,
                interval,
                isEnabled
              });
            }
            
            console.log('解析到的循环任务:', newTasks);
            setIntervalTasks(newTasks);
            
            if (newTasks.length === 0) {
              Taro.showToast({
                title: '暂无循环任务',
                icon: 'none'
              });
            } else {
              Taro.showToast({
                title: `获取到 ${newTasks.length} 个任务`,
                icon: 'success',
                duration: 1500
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('获取循环任务失败:', error);
      setIntervalTasks([]);
    }
  };
  
  // 辅助函数：将字符串转换为UTF-8字节数组（兼容微信小程序）
  const stringToUtf8Bytes = (str: string): Uint8Array => {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      
      if (code < 0x80) {
        // 1字节字符
        bytes.push(code);
      } else if (code < 0x800) {
        // 2字节字符
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        // 3字节字符
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      } else {
        // 4字节字符（代理对）
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (code >> 18));
        bytes.push(0x80 | ((code >> 12) & 0x3f));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      }
    }
    return new Uint8Array(bytes);
  };
  
  // 辅助函数：构造单个定时任务的数据字节数组
  // 数据格式：[任务ID长度(1字节)][任务ID(1字节)][文件ID长度(1字节=4)][文件ID(4字节=文件名)][音量(1字节)][继电器(1字节)][开始时间(2字节:小时+分钟)][结束时间(2字节:小时+分钟)][星期掩码(1字节)][启用状态(1字节)]
  const buildScheduleTaskBytes = (task: Task, taskIndex: number): number[] => {
    const taskBytes: number[] = [];
    
    // 任务ID：使用任务下标位置（从1开始）
    const taskId = String(taskIndex + 1); // 下标从0开始，所以+1
    const taskIdBytes = Array.from(stringToUtf8Bytes(taskId));
    taskBytes.push(taskIdBytes.length); // 任务ID长度（1字节）
    taskBytes.push(...taskIdBytes);     // 任务ID（N字节）
    
    // 文件ID：使用文件名（4位数字，固定4字节）
    // 从fileName中提取纯数字部分（去掉.mp3后缀）
    const fileNameWithoutExt = task.fileName.replace(/\.mp3$/i, '');
    const fileIdBytes = Array.from(stringToUtf8Bytes(fileNameWithoutExt));
    taskBytes.push(4);              // 文件ID长度（固定4字节）
    taskBytes.push(...fileIdBytes); // 文件ID（4字节，如"1111"）
    
    // 音量（1字节，范围0-30）
    taskBytes.push(task.volume);
    
    // 继电器（1字节，0x00=关，0x01=开）
    taskBytes.push(task.relayEnabled ? 0x01 : 0x00);
    
    // 开始时间（2字节：小时+分钟，HEX格式）
    const [startHour, startMinute] = task.startTime.split(':').map(Number);
    taskBytes.push(startHour);   // 小时（0-23）
    taskBytes.push(startMinute); // 分钟（0-59）
    
    // 结束时间（2字节：小时+分钟，HEX格式）
    const [endHour, endMinute] = task.endTime.split(':').map(Number);
    taskBytes.push(endHour);   // 小时（0-23）
    taskBytes.push(endMinute); // 分钟（0-59）
    
    // 星期几（1字节，位掩码，符合ISO 8601：bit0=周一到bit6=周日）
    let daysMask = 0;
    if (task.selectedDays.includes('一')) daysMask |= 0x01; // bit0: 周一
    if (task.selectedDays.includes('二')) daysMask |= 0x02; // bit1: 周二
    if (task.selectedDays.includes('三')) daysMask |= 0x04; // bit2: 周三
    if (task.selectedDays.includes('四')) daysMask |= 0x08; // bit3: 周四
    if (task.selectedDays.includes('五')) daysMask |= 0x10; // bit4: 周五
    if (task.selectedDays.includes('六')) daysMask |= 0x20; // bit5: 周六
    if (task.selectedDays.includes('日')) daysMask |= 0x40; // bit6: 周日
    taskBytes.push(daysMask);
    
    // 启用状态（1字节，0x00=禁用，0x01=启用）
    taskBytes.push(task.isEnabled ? 0x01 : 0x00);
    
    return taskBytes;
  };
  
  // 辅助函数：构造单个间隔播放任务的数据字节数组
  // 数据格式：[任务ID长度(1字节)][任务ID(1字节)][文件ID长度(1字节=4)][文件ID(4字节=文件名)][音量(1字节)][继电器(1字节)][间隔时间(1字节)][启用状态(1字节)]
  const buildIntervalTaskBytes = (task: IntervalTask, taskIndex: number): number[] => {
    const taskBytes: number[] = [];
    
    // 任务ID：使用任务下标位置（从1开始）
    const taskId = String(taskIndex + 1); // 下标从0开始，所以+1
    const taskIdBytes = Array.from(stringToUtf8Bytes(taskId));
    taskBytes.push(taskIdBytes.length); // 任务ID长度（1字节）
    taskBytes.push(...taskIdBytes);     // 任务ID（N字节）
    
    // 文件ID：使用文件名（4位数字，固定4字节）
    // 从fileName中提取纯数字部分（去掉.mp3后缀）
    const fileNameWithoutExt = task.fileName.replace(/\.mp3$/i, '');
    const fileIdBytes = Array.from(stringToUtf8Bytes(fileNameWithoutExt));
    taskBytes.push(4);              // 文件ID长度（固定4字节）
    taskBytes.push(...fileIdBytes); // 文件ID（4字节，如"1111"）
    
    // 音量（1字节，范围0-30）
    taskBytes.push(task.volume);
    
    // 继电器（1字节，0x00=关，0x01=开）
    taskBytes.push(task.relayEnabled ? 0x01 : 0x00);
    
    // 间隔时间（1字节，单位：秒）
    taskBytes.push(task.interval);
    
    // 启用状态（1字节，0x00=禁用，0x01=启用）
    taskBytes.push(task.isEnabled ? 0x01 : 0x00);
    
    return taskBytes;
  };
  
  // 同步任务到设备
  const syncTasksToDevice = async () => {
    try {
      // 同步定时任务
      if (tasks.length > 0) {
        // 构造所有任务的数据，用"/"分隔符拼接
        const allTaskBytes: number[] = [];
        
        for (let i = 0; i < tasks.length; i++) {
          // 添加分隔符 '/' (0x2F) - 每个任务前都加分隔符
          allTaskBytes.push(0x2F);
          
          // 添加任务数据（传入任务索引）
          const taskBytes = buildScheduleTaskBytes(tasks[i], i);
          allTaskBytes.push(...taskBytes);
        }
        
        // 将字节数组转换为十六进制字符串
        const taskDataHex = allTaskBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        
        // 计算整体长度：命令码(2字节) + 方向(1字节) + 数据长度
        const totalLength = 2 + 1 + allTaskBytes.length;
        const totalLengthHex = totalLength.toString(16).padStart(2, '0').toUpperCase();
        
        // 构造完整指令
        const command = `7E ${totalLengthHex} 01 02 40 ${taskDataHex}`;
        
        console.log('发送定时任务同步指令（一次性）:', command);
        console.log('任务数量:', tasks.length);
        console.log('数据总长度:', allTaskBytes.length, '字节');
        
        // 发送指令并等待响应
        await new Promise<boolean>((resolve, reject) => {
          let timeoutId: any;
          
          sendCommandToDevice(command, (data) => {
            console.log('定时任务同步响应:', data);
            
            // 清除超时定时器
            if (timeoutId) clearTimeout(timeoutId);
            
            // 检查响应是否成功
            if (data.resValue && data.resValue.length >= 4) {
              const responseCmd = data.resValue[1]; // 应答命令码
              const result = data.resValue[3]; // 结果 01=成功, 00=失败
              
              if (responseCmd === RESPONSE_CODES.SCHEDULE_TASK_UPDATE_RESULT && result === RESULT_CODES.SUCCESS) {
                console.log('定时任务同步成功');
                resolve(true);
              } else {
                console.warn('定时任务同步失败');
                resolve(false);
              }
            } else {
              console.warn('收到无效响应');
              resolve(false);
            }
            
            return false; // 取消监听
          });
          
          // 设置超时保护（5秒）
          timeoutId = setTimeout(() => {
            console.error('等待定时任务同步响应超时');
            reject(new Error('等待响应超时'));
          }, 5000);
        }).then((success) => {
          if (success) {
            Taro.showToast({
              title: `已同步 ${tasks.length} 个定时任务`,
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
        }).catch((error) => {
          console.error('发送定时任务指令失败:', error);
          Taro.showToast({
            title: '同步任务失败',
            icon: 'none',
            duration: 2000
          });
        });
      }
      
      // 同步循环任务
      if (intervalTasks.length > 0) {
        // 构造所有任务的数据，用"/"分隔符拼接
        const allTaskBytes: number[] = [];
        
        for (let i = 0; i < intervalTasks.length; i++) {
          // 添加分隔符 '/' (0x2F) - 每个任务前都加分隔符
          allTaskBytes.push(0x2F);
          
          // 添加任务数据（传入任务索引）
          const taskBytes = buildIntervalTaskBytes(intervalTasks[i], i);
          allTaskBytes.push(...taskBytes);
        }
        
        // 将字节数组转换为十六进制字符串
        const taskDataHex = allTaskBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        
        // 计算整体长度：命令码(2字节) + 方向(1字节) + 数据长度
        const totalLength = 2 + 1 + allTaskBytes.length;
        const totalLengthHex = totalLength.toString(16).padStart(2, '0').toUpperCase();
        
        // 构造完整指令
        const command = `7E ${totalLengthHex} 01 02 50 ${taskDataHex}`;
        
        console.log('发送循环任务同步指令（一次性）:', command);
        console.log('任务数量:', intervalTasks.length);
        console.log('数据总长度:', allTaskBytes.length, '字节');
        
        // 发送指令并等待响应
        await new Promise<boolean>((resolve, reject) => {
          let timeoutId: any;
          
          sendCommandToDevice(command, (data) => {
            console.log('循环任务同步响应:', data);
            
            // 清除超时定时器
            if (timeoutId) clearTimeout(timeoutId);
            
            // 检查响应是否成功
            if (data.resValue && data.resValue.length >= 4) {
              const responseCmd = data.resValue[1]; // 应答命令码
              const result = data.resValue[3]; // 结果 01=成功, 00=失败
              
              if (responseCmd === RESPONSE_CODES.INTERVAL_TASK_UPDATE_RESULT && result === RESULT_CODES.SUCCESS) {
                console.log('循环任务同步成功');
                resolve(true);
              } else {
                console.warn('循环任务同步失败');
                resolve(false);
              }
            } else {
              console.warn('收到无效响应');
              resolve(false);
            }
            
            return false; // 取消监听
          });
          
          // 设置超时保护（5秒）
          timeoutId = setTimeout(() => {
            console.error('等待循环任务同步响应超时');
            reject(new Error('等待响应超时'));
          }, 5000);
        }).then((success) => {
          if (success) {
            Taro.showToast({
              title: `已同步 ${intervalTasks.length} 个循环任务`,
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
        }).catch((error) => {
          console.error('发送循环任务指令失败:', error);
          Taro.showToast({
            title: '同步任务失败',
            icon: 'none',
            duration: 2000
          });
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