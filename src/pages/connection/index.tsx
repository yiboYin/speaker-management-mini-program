import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useReachBottom, navigateTo, useDidShow } from '@tarojs/taro'
import DeviceConnection from '@/components/DeviceConnection'
import { clearConnectedDevice, getConnectedDevice, sendCommandToDevice, decodeUtf8Bytes } from '@/utils/deviceUtils';
import { Device } from '@/types/device';
import { CONTROL_COMMANDS, RESPONSE_CODES, RESULT_CODES, TASK_COMMANDS } from '@/constants/bluetoothCommands';
import './index.scss'

const ConnectionPage: React.FC = () => {
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  
  // 静音状态
  const [isMuted, setIsMuted] = useState(false);
  
  // 任务列表状态 - 分两个数组管理
  const [loopSensorTasks, setLoopSensorTasks] = useState<any[]>([]); // 循环/感应任务（最多5个）
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);   // 到点播放任务（最多5个）
  
  // 合并后的任务列表（用于展示）
  const tasks = [...loopSensorTasks, ...scheduledTasks];

  // 从全局变量读取已连接设备信息
  useEffect(() => {
    const savedDevice = getConnectedDevice();
    if (savedDevice) {
      console.log('从全局变量读取已连接设备:', savedDevice);
      setCurrentDevice(savedDevice);
    }
  }, []);

  // 每次页面显示时检查设备状态
  useDidShow(() => {
    console.log('页面显示，检查设备连接状态');
    const savedDevice = getConnectedDevice();
    if (savedDevice) {
      console.log('检测到已连接设备:', savedDevice.name);
      setCurrentDevice(savedDevice);
    } else {
      console.log('未检测到已连接设备');
      setCurrentDevice(null);
    }
  });

  // 控制面板按钮处理函数
  const handleControlButtonClick = (action: string) => {
    console.log(`执行操作: ${action}`);
    
    let command = '';
    switch(action) {
      case 'previous':
        command = CONTROL_COMMANDS.PREVIOUS;
        break;
      case 'next':
        command = CONTROL_COMMANDS.NEXT;
        break;
      case 'mute':
        command = CONTROL_COMMANDS.MUTE_TOGGLE;
        break;
      case 'volumeUp':
        command = CONTROL_COMMANDS.VOLUME_UP;
        break;
      case 'volumeDown':
        command = CONTROL_COMMANDS.VOLUME_DOWN;
        break;
      case 'factoryReset':
        command = CONTROL_COMMANDS.FACTORY_RESET;
        break;
      default:
        return;
    }
    
    if (command) {
      sendCommandToDevice(command, (data) => {
        console.log(`${action} 操作返回数据:`, data);
        
        // 如果是静音操作，解析返回结果
        if (action === 'mute' && data.resValue && data.resValue.length >= 6) {
          const responseCmd = data.resValue[4];
          const result = data.resValue[5];
          
          if (responseCmd === RESPONSE_CODES.MUTE_TOGGLE_RESULT) {
            if (result === RESULT_CODES.SUCCESS) {
              setIsMuted(true);
              Taro.showToast({
                title: '静音已开启',
                icon: 'success',
                duration: 1500
              });
            } else {
              setIsMuted(false);
              Taro.showToast({
                title: '静音已关闭',
                icon: 'none',
                duration: 1500
              });
            }
          }
        }
        
        return false;
      }).then(() => {
        console.log(`${action} 指令发送完成`);
        
        // 如果是恢复出厂设置，清空本地任务列表
        if (action === 'factoryReset') {
          setLoopSensorTasks([]);
          setScheduledTasks([]);
          
          Taro.showToast({
            title: '任务已清空',
            icon: 'success',
            duration: 1500
          });
          
          console.log('恢复出厂设置：已清空本地任务列表');
        }
      }).catch((error) => {
        console.error(`${action} 指令发送失败:`, error);
        Taro.showToast({
          title: `${action} 指令发送失败`,
          icon: 'none',
          duration: 2000
        });
      });
    }
  };

  // 处理断开连接
  const handleDisconnect = () => {
    // TODO: 暂时禁用断开连接功能
    // if (currentDevice && currentDevice.deviceId) {
    //   Taro.closeBLEConnection({
    //     deviceId: currentDevice.deviceId,
    //     success: () => {
    //       console.log('断开连接成功:', currentDevice.name);
    //       clearConnectedDevice();
    //       setCurrentDevice(null);
    //     },
    //     fail: (err) => {
    //       console.error('断开连接失败:', err);
    //     }
    //   });
    // }
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
  
  // 页面加载时获取任务列表
  useEffect(() => {
    fetchTasks();
    
    // 监听来自编辑页面的事件
    Taro.eventCenter.on('updateTask', (updatedTask) => {
      const isScheduled = updatedTask.playMode === 3; // PlayMode.SCHEDULED
      
      if (isScheduled) {
        // 更新到点播放任务
        setScheduledTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          )
        );
      } else {
        // 更新循环/感应任务
        setLoopSensorTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          )
        );
      }
    });
    
    // 监听新增定时任务事件
    Taro.eventCenter.on('addNewTask', (newTask) => {
      // 生成唯一ID和任务名称
      const newId = Date.now().toString();
      const isScheduled = newTask.playMode === 3; // PlayMode.SCHEDULED
      
      const newTaskWithId = {
        ...newTask,
        id: newId,
        isEnabled: true // 新增任务默认启用
      };
      
      if (isScheduled) {
        // 添加到点播放任务（最多5个）
        setScheduledTasks(prevTasks => {
          if (prevTasks.length >= 5) {
            Taro.showToast({
              title: '到点播放任务已达上限（5个）',
              icon: 'none',
              duration: 2000
            });
            return prevTasks;
          }
          // 计算到点播放任务的序号
          const scheduledCount = prevTasks.length + 1;
          return [{ ...newTaskWithId, taskName: `任务 ${scheduledCount}` }, ...prevTasks];
        });
      } else {
        // 添加循环/感应任务（最多5个）
        setLoopSensorTasks(prevTasks => {
          if (prevTasks.length >= 5) {
            Taro.showToast({
              title: '循环/感应任务已达上限（5个）',
              icon: 'none',
              duration: 2000
            });
            return prevTasks;
          }
          // 计算循环/感应任务的序号
          const loopSensorCount = prevTasks.length + 1;
          return [{ ...newTaskWithId, taskName: `任务 ${loopSensorCount}` }, ...prevTasks];
        });
      }
    });
    
    // 监听恢复出厂设置事件，清空所有任务（已废弃，直接在 handleControlButtonClick 中处理）
    // Taro.eventCenter.on('clearAllTasks', () => {
    //   console.log('收到清空任务事件');
    //   setLoopSensorTasks([]);
    //   setScheduledTasks([]);
    //   
    //   Taro.showToast({
    //     title: '任务已清空',
    //     icon: 'success',
    //     duration: 1500
    //   });
    // });
    
    // 监听设备连接成功事件，自动获取任务列表
    Taro.eventCenter.on('deviceConnected', () => {
      console.log('收到设备连接事件，开始获取任务列表');
      // 延迟1.5秒再获取任务，确保设备完全就绪
      setTimeout(() => {
        fetchTasks();
      }, 1500);
    });
    
    // 清理事件监听器
    return () => {
      Taro.eventCenter.off('updateTask');
      Taro.eventCenter.off('addNewTask');
      // Taro.eventCenter.off('clearAllTasks'); // 已废弃
      Taro.eventCenter.off('deviceConnected');
    };
  }, []);
  
  // 从设备获取定时任务列表
  const fetchTasks = async () => {
    try {
      await sendCommandToDevice(TASK_COMMANDS.GET_SCHEDULE_TASKS, (data) => {
        console.log('获取定时任务返回数据:', data);
        
        // 解析设备返回的任务数据
        if (data.resValue && data.resValue.length >= 5) {
          const responseCmd = data.resValue[4]; // 响应命令码（第5个字节）
          
          // 检查是否是任务数据指令（0x43）
          if (responseCmd === RESPONSE_CODES.SCHEDULE_TASK_END) {
            // 从第5个字节开始是任务数据（跳过帧头、长度、方向、固定值、响应码）
            const taskDataBytes = data.resValue.slice(5);
            
            // 将字节数组转换为字符串
            const taskDataStr = decodeUtf8Bytes(new Uint8Array(taskDataBytes));
            
            console.log('任务数据原始字符串:', taskDataStr);
            
            // 按"/"分割任务
            const taskStrings = taskDataStr.split('/').filter(s => s.length > 0);
            
            console.log('解析到的任务数量:', taskStrings.length);
            
            // 解析每个任务
            const loopSensorTasksList: any[] = []; // 循环/感应任务
            const scheduledTasksList: any[] = [];   // 到点播放任务
            let taskIdCounter = 1;
            
            for (const taskStr of taskStrings) {
              // 任务信息格式：
              // ['/'分隔符1byte][任务编号1byte][播放方式1byte][文件名长度1byte][文件名4byte] 
              // [时间字段4byte: 非定时=开始+结束, 定时=播放时间+次数]
              // [星期几1byte][间隔时间2byte][启用状态1byte]
              
              // 将任务字符串转换为字节数组
              const taskBytes: number[] = [];
              for (let i = 0; i < taskStr.length; i++) {
                taskBytes.push(taskStr.charCodeAt(i));
              }
              
              if (taskBytes.length < 14) {
                console.warn('任务数据长度不足，跳过:', taskBytes.length);
                continue;
              }
              
              let currentIndex = 0;
              
              // 任务编号（1字节）
              const taskId = taskBytes[currentIndex];
              currentIndex++;
              
              // 播放方式（1字节）：1=循环播放，2=感应播放，3=到点播放
              const playMode = taskBytes[currentIndex];
              currentIndex++;
              
              // 跳过文件名长度（1字节，固定为4）
              const fileNameLength = taskBytes[currentIndex];
              currentIndex++;
              
              // 文件名（4字节）
              const fileNameBytes = taskBytes.slice(currentIndex, currentIndex + 4);
              const fileNameWithoutExt = decodeUtf8Bytes(new Uint8Array(fileNameBytes));
              const fileName = `${fileNameWithoutExt}.mp3`;
              currentIndex += 4;
              
              let startTime = '00:00';
              let endTime = '23:59';
              let scheduledTime = undefined;
              let repeatCount = undefined;
              
              if (playMode === 3) {
                // 定时播放任务：[播放时间2byte] [播放次数2byte]
                // 播放时间（2字节：小时+分钟）
                const hour = taskBytes[currentIndex];
                const minute = taskBytes[currentIndex + 1];
                scheduledTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                currentIndex += 2;
                
                // 播放次数（2字节）
                const repeatHigh = taskBytes[currentIndex];
                const repeatLow = taskBytes[currentIndex + 1];
                repeatCount = repeatHigh * 256 + repeatLow;
                currentIndex += 2;
              } else {
                // 非定时播放任务：[开始时间2byte] [结束时间2byte]
                // 开始时间（2字节：小时+分钟）
                const startHour = taskBytes[currentIndex];
                const startMinute = taskBytes[currentIndex + 1];
                startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                currentIndex += 2;
                
                // 结束时间（2字节：小时+分钟）
                const endHour = taskBytes[currentIndex];
                const endMinute = taskBytes[currentIndex + 1];
                endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                currentIndex += 2;
              }
              
              // 星期掩码（1字节）
              const weekMask = taskBytes[currentIndex];
              currentIndex++;
              
              // 间隔时间（2字节，单位：秒）
              const intervalHigh = taskBytes[currentIndex];
              const intervalLow = taskBytes[currentIndex + 1];
              const interval = intervalHigh * 256 + intervalLow;
              currentIndex += 2;
              
              // 启用状态（1字节，0x01=启用，0x00=禁用）
              const isEnabled = taskBytes[currentIndex] === 0x01;
              currentIndex++;
              
              // 解析星期掩码
              const selectedDays: string[] = [];
              const weekDayMap = ['一', '二', '三', '四', '五', '六', '日'];
              for (let i = 0; i < 7; i++) {
                if (weekMask & (1 << i)) {
                  selectedDays.push(weekDayMap[i]); // 使用中文格式：一、二、三...
                }
              }
              
              // 生成任务ID
              const id = `schedule_${String(taskIdCounter).padStart(2, '0')}`;
              taskIdCounter++;
              
              const taskData = {
                id,
                taskName: `任务 ${taskIdCounter - 1}`,
                fileName,
                filePath: '', // 硬件文件不需要本地路径
                selectedDays,
                volume: 3,    // 默认音量（协议中已移除）
                playMode,
                interval,
                startTime,
                endTime,
                scheduledTime,
                repeatCount,
                isEnabled
              };
              
              // 根据播放模式分类存储
              if (playMode === 3) {
                // 到点播放任务（最多5个）
                if (scheduledTasksList.length < 5) {
                  scheduledTasksList.push(taskData);
                }
              } else {
                // 循环/感应任务（最多5个）
                if (loopSensorTasksList.length < 5) {
                  loopSensorTasksList.push(taskData);
                }
              }
            }
            
            console.log('解析到的循环/感应任务:', loopSensorTasksList);
            console.log('解析到的到点播放任务:', scheduledTasksList);
            
            setLoopSensorTasks(loopSensorTasksList);
            setScheduledTasks(scheduledTasksList);
            
            const totalTasks = loopSensorTasksList.length + scheduledTasksList.length;
            if (totalTasks === 0) {
              Taro.showToast({
                title: '暂无定时任务',
                icon: 'none'
              });
            } else {
              Taro.showToast({
                title: `获取到 ${totalTasks} 个任务`,
                icon: 'success',
                duration: 1500
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('获取定时任务失败:', error);
      setLoopSensorTasks([]);
      setScheduledTasks([]);
    }
  };
  
  // 辅助函数：构造单个定时任务的数据字节数组
  const buildScheduleTaskBytes = (task: any, taskIndex: number, isScheduled: boolean): number[] => {
    const taskBytes: number[] = [];
    
    // 任务编号：非定时播放任务为下标+1，定时播放任务为下标+6（使用16进制单字节）
    const taskIdNumber = isScheduled ? (taskIndex + 6) : (taskIndex + 1);
    console.log('任务编号', taskIdNumber, '(0x' + taskIdNumber.toString(16).toUpperCase() + ')')
    taskBytes.push(taskIdNumber); // 任务编号（1字节，16进制值）
    
    // 播放方式（1字节）：1=循环播放，2=感应播放，3=到点播放
    taskBytes.push(task.playMode || 1);
    
    // 文件名长度（1字节，固定4字节）
    const fileNameWithoutExt = task.fileName.replace(/\.mp3$/i, '');
    const fileIdBytes = Array.from(stringToUtf8Bytes(fileNameWithoutExt));
    taskBytes.push(4);              // 文件名长度（固定4字节）
    taskBytes.push(...fileIdBytes); // 文件名（4字节）
    
    if (isScheduled) {
      // 定时播放任务：[播放时间2byte] [播放次数2byte]
      // 播放时间（2字节：小时+分钟）
      if (task.scheduledTime) {
        const [hour, minute] = task.scheduledTime.split(':').map(Number);
        taskBytes.push(hour);   // 小时（0-23）
        taskBytes.push(minute); // 分钟（0-59）
      } else {
        taskBytes.push(0); // 默认0小时
        taskBytes.push(0); // 默认0分钟
      }
      
      // 播放次数（2字节）
      const repeatCount = task.repeatCount || 1;
      taskBytes.push(Math.floor(repeatCount / 256)); // 高字节
      taskBytes.push(repeatCount % 256);             // 低字节
    } else {
      // 非定时播放任务：[开始时间2byte] [结束时间2byte]
      // 开始时间（2字节：小时+分钟）
      const [startHour, startMinute] = task.startTime ? task.startTime.split(':').map(Number) : [0, 0];
      taskBytes.push(startHour);   // 小时（0-23）
      taskBytes.push(startMinute); // 分钟（0-59）
      
      // 结束时间（2字节：小时+分钟）
      const [endHour, endMinute] = task.endTime ? task.endTime.split(':').map(Number) : [23, 59];
      taskBytes.push(endHour);   // 小时（0-23）
      taskBytes.push(endMinute); // 分钟（0-59）
    }
    
    // 星期掩码（1字节，bit0-6对应周一到周日）
    let weekMask = 0;
    for (const day of task.selectedDays) {
      // 支持两种格式：数字字符串('1'-'7')和中文字符串('一'-'日')
      let dayNum = 0;
      if (day === '一') dayNum = 1;
      else if (day === '二') dayNum = 2;
      else if (day === '三') dayNum = 3;
      else if (day === '四') dayNum = 4;
      else if (day === '五') dayNum = 5;
      else if (day === '六') dayNum = 6;
      else if (day === '日') dayNum = 7;
      else {
        // 尝试解析为数字
        dayNum = parseInt(day);
      }
      
      if (dayNum >= 1 && dayNum <= 7) {
        weekMask |= (1 << (dayNum - 1)); // bit0对应周一
      }
    }
    console.log('星期掩码', weekMask, 'selectedDays:', task.selectedDays)
    taskBytes.push(weekMask);
    
    // 间隔时间（2字节，单位：秒）
    const interval = task.interval || 0;
    taskBytes.push(Math.floor(interval / 256)); // 高字节
    taskBytes.push(interval % 256);             // 低字节
    
    // 启用状态（1字节，0x01=启用，0x00=禁用）
    taskBytes.push(task.isEnabled ? 0x01 : 0x00);
    
    return taskBytes;
  };
  
  // 辅助函数：将时间字符串转换为分钟数
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  };
  
  // 辅助函数：检查两个时间区间是否重叠（不允许跨天）
  const isTimeOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    // 判断是否重叠：一个区间的开始时间在另一个区间内
    // 由于不允许跨天，直接比较即可
    return !(end1 <= start2 || end2 <= start1);
  };
  
  // 辅助函数：检查星期是否有交集
  const hasWeekOverlap = (days1: string[], days2: string[]): boolean => {
    return days1.some(day => days2.includes(day));
  };
  
  // 辅助函数：校验循环/感应任务的时间重叠
  const validateLoopSensorTasks = (): { valid: boolean; message?: string } => {
    // 只检查启用的循环/感应任务（playMode=1或2）
    const enabledTasks = loopSensorTasks.filter(task => task.isEnabled && task.playMode !== 3);
    
    if (enabledTasks.length <= 1) {
      return { valid: true }; // 0个或1个任务不可能重叠
    }
    
    // 首先校验每个任务的时间合法性（开始时间必须小于结束时间）
    for (let i = 0; i < enabledTasks.length; i++) {
      const task = enabledTasks[i];
      const startMinutes = timeToMinutes(task.startTime || '00:00');
      const endMinutes = timeToMinutes(task.endTime || '23:59');
      
      if (startMinutes >= endMinutes) {
        const taskName = task.taskName || `任务${i + 1}`;
        return {
          valid: false,
          message: `${taskName} 的开始时间必须小于结束时间`
        };
      }
    }
    
    // 两两比较所有启用的任务
    for (let i = 0; i < enabledTasks.length; i++) {
      for (let j = i + 1; j < enabledTasks.length; j++) {
        const task1 = enabledTasks[i];
        const task2 = enabledTasks[j];
        
        // 检查星期是否有交集
        if (!hasWeekOverlap(task1.selectedDays || [], task2.selectedDays || [])) {
          continue; // 星期没有交集，跳过
        }
        
        // 星期有交集，检查时间是否重叠
        const start1 = timeToMinutes(task1.startTime || '00:00');
        const end1 = timeToMinutes(task1.endTime || '23:59');
        const start2 = timeToMinutes(task2.startTime || '00:00');
        const end2 = timeToMinutes(task2.endTime || '23:59');
        
        if (isTimeOverlap(start1, end1, start2, end2)) {
          // 发现重叠，返回错误信息
          const taskName1 = task1.taskName || `任务${i + 1}`;
          const taskName2 = task2.taskName || `任务${j + 1}`;
          
          // 找出共同的星期
          const commonDays = (task1.selectedDays || []).filter(day => 
            (task2.selectedDays || []).includes(day)
          );
          const weekText = commonDays.map(d => `周${d}`).join('、');
          
          return {
            valid: false,
            message: `${taskName1} 和 ${taskName2} 在${weekText}的时间区间存在重叠`
          };
        }
      }
    }
    
    return { valid: true };
  };
  
  // 同步任务到设备
  const syncTasksToDevice = async () => {
    try {
      // 校验循环/感应任务的时间重叠
      const validationResult = validateLoopSensorTasks();
      if (!validationResult.valid) {
        Taro.showModal({
          title: '时间冲突',
          content: validationResult.message || '存在时间重叠的任务，请调整后再同步',
          showCancel: false,
          confirmText: '知道了'
        });
        return; // 终止同步
      }
      
      Taro.showLoading({
        title: '同步中...',
        mask: true
      });
      
      // 构造所有任务的数据
      const allTaskBytes: number[] = [];
      
      if (tasks.length > 0) {
        // 构造所有任务的数据，用"/"分隔符拼接
        for (let i = 0; i < tasks.length; i++) {
          // 添加分隔符 '/' (0x2F) - 每个任务前都加分隔符
          allTaskBytes.push(0x2F);
          
          // 判断是否为定时播放任务
          const isScheduled = tasks[i].playMode === 3;
          
          // 计算在各自数组中的索引
          let taskIndexInArray = 0;
          if (isScheduled) {
            // 在到点播放数组中的索引
            taskIndexInArray = scheduledTasks.findIndex(t => t.id === tasks[i].id);
          } else {
            // 在循环/感应数组中的索引
            taskIndexInArray = loopSensorTasks.findIndex(t => t.id === tasks[i].id);
          }
          
          // 添加任务数据（传入任务索引和是否定时播放标志）
          const taskBytes = buildScheduleTaskBytes(tasks[i], taskIndexInArray, isScheduled);
          allTaskBytes.push(...taskBytes);
        }
      } else {
        // 无任务时，任务数据部分为 00
        allTaskBytes.push(0x00);
      }
      
      // 将字节数组转换为十六进制字符串
      const taskDataHex = allTaskBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      
      // 计算整体长度：命令码(2字节) + 方向(1字节) + 数据长度
      const totalLength = 2 + 1 + allTaskBytes.length;
      const totalLengthHex = totalLength.toString(16).padStart(2, '0').toUpperCase();
      
      // 构造完整指令
      const command = `7E ${totalLengthHex} 01 02 40 ${taskDataHex}`;
      
      console.log('发送定时任务同步指令:', command);
      console.log('任务数量:', tasks.length);
      console.log('循环/感应任务数:', loopSensorTasks.length);
      console.log('到点播放任务数:', scheduledTasks.length);
      console.log('数据总长度:', allTaskBytes.length, '字节');
      
      // 发送指令并等待响应
      await new Promise<boolean>((resolve, reject) => {
        let timeoutId: any;
        
        sendCommandToDevice(command, (data) => {
          console.log('定时任务同步响应:', data);
          
          // 清除超时定时器
          if (timeoutId) clearTimeout(timeoutId);
          
          // 检查响应是否成功
          if (data.resValue && data.resValue.length >= 5) {
            const responseCmd = data.resValue[4]; // 应答命令码（第5个字节）
            const result = data.resValue[5]; // 结果 01=成功, 00=失败（第6个字节）
            
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
        Taro.hideLoading();
        if (success) {
          Taro.showToast({
            title: tasks.length > 0 ? `已同步 ${tasks.length} 个定时任务` : '已清空定时任务',
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
        Taro.hideLoading();
        console.error('发送定时任务指令失败:', error);
        Taro.showToast({
          title: '同步任务失败',
          icon: 'none',
          duration: 2000
        });
      });
    } catch (error) {
      Taro.hideLoading();
      console.error('同步任务到设备失败:', error);
      Taro.showToast({
        title: '同步任务失败',
        icon: 'none',
        duration: 2000
      });
    }
  };
  


  return (
    <View className="connection-page">
      {/* 顶部设备连接区域 */}
      <View className="top-section">
        <DeviceConnection 
          currentDevice={currentDevice}
          onClick={() => {
            // 点击跳转到设备列表页面
            Taro.navigateTo({
              url: '/pages/connection/device-list/index'
            });
          }}
        />
      </View>
      
      {/* 中间按钮区域 - 仅在已连接时显示断开按钮 */}
      {/* TODO: 暂时禁用断开连接按钮 */}
      {/* {currentDevice && (
        <View className="middle-section">
          <View className="disconnect-btn" onClick={handleDisconnect}>
            断开连接（已禁用）
          </View>
        </View>
      )} */}
      
      {/* 控制面板 */}
      <View className="control-panel">
        <View className="panel-title">控制面板</View>
        <View className="button-grid">
          <View className="grid-button" onClick={() => handleControlButtonClick('previous')}>
            <Text className="btn-icon">⏮</Text>
            <Text className="btn-text">上一首</Text>
          </View>
          <View className="grid-button" onClick={() => handleControlButtonClick('next')}>
            <Text className="btn-icon">⏭</Text>
            <Text className="btn-text">下一首</Text>
          </View>
          <View className={`grid-button grid-button-mute ${isMuted ? 'muted' : ''}`} onClick={() => handleControlButtonClick('mute')}>
            <Text className="btn-icon">{isMuted ? '🔇' : '🔊'}</Text>
            <Text className="btn-text">静音</Text>
          </View>
          <View className="grid-button" onClick={() => handleControlButtonClick('volumeUp')}>
            <Text className="btn-icon">+</Text>
            <Text className="btn-text">音量加</Text>
          </View>
          <View className="grid-button" onClick={() => handleControlButtonClick('volumeDown')}>
            <Text className="btn-icon">−</Text>
            <Text className="btn-text">音量减</Text>
          </View>
          <View className="grid-button grid-button-reset" onClick={() => handleControlButtonClick('factoryReset')}>
            <Text className="btn-icon">↻</Text>
            <Text className="btn-text">恢复出厂</Text>
          </View>
        </View>
      </View>
      
      {/* 播放任务模块 */}
      <View className="task-section">
        <View className="task-header">
          <Text className="task-title">播放任务</Text>
          <View className="add-task-btn" onClick={() => {
            navigateTo({
              url: '/pages/task/schedule-edit/index'
            });
          }}>
            <Text className="add-icon">+</Text>
            <Text className="add-text">添加任务</Text>
          </View>
        </View>
        
        <View className="task-list-container">
          {tasks.length > 0 ? (
            tasks.map((task, index) => {
              // 根据播放模式判断是否为定时播放任务
              const isScheduledTask = task.playMode === 3; // PlayMode.SCHEDULED
              
              // 播放模式文本映射
              const playModeText = {
                1: '循环播放',
                2: '感应播放',
                3: '到点播放'
              };
              
              return (
                <View key={task.id} className="task-item">
                  {/* 第一行：星期 + 开关 */}
                  <View className="task-row-1">
                    {/* 左侧：星期选择 - 圆形标签 */}
                    <View className="days-row">
                      {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                        const isSelected = task.selectedDays && task.selectedDays.includes(day);
                        return (
                          <View 
                            key={day} 
                            className={`day-circle ${isSelected ? 'selected' : ''}`}
                          >
                            {day}
                          </View>
                        );
                      })}
                    </View>
                    
                    {/* 右侧：开关 */}
                    <View 
                      className={`toggle-switch ${task.isEnabled ? 'enabled' : 'disabled'}`}
                      onClick={() => {
                        const isScheduled = task.playMode === 3; // PlayMode.SCHEDULED
                        
                        if (isScheduled) {
                          // 更新到点播放任务
                          setScheduledTasks(prevTasks => 
                            prevTasks.map(t => 
                              t.id === task.id ? { ...t, isEnabled: !t.isEnabled } : t
                            )
                          );
                        } else {
                          // 更新循环/感应任务
                          setLoopSensorTasks(prevTasks => 
                            prevTasks.map(t => 
                              t.id === task.id ? { ...t, isEnabled: !t.isEnabled } : t
                            )
                          );
                        }
                      }}
                    >
                      <View className="toggle-knob"></View>
                    </View>
                  </View>
                  
                  {/* 第二行：播放模式 + 编辑按钮 */}
                  <View className="task-row-2">
                    {/* 左侧：播放模式 */}
                    <Text className="mode-text">{playModeText[task.playMode] || '--'}</Text>
                    
                    {/* 右侧：编辑按钮 */}
                    <Button 
                      className="edit-btn" 
                      size="mini"
                      onClick={() => {
                        // 跳转到编辑页面
                        const taskData = encodeURIComponent(JSON.stringify(task));
                        navigateTo({
                          url: `/pages/task/schedule-edit/index?data=${taskData}`
                        });
                      }}
                    >
                      编辑
                    </Button>
                  </View>
                  
                  {/* 第三行：时间信息 + 删除按钮 */}
                  <View className="task-row-3">
                    {/* 左侧：时间信息 */}
                    {!isScheduledTask ? (
                      <View className="time-range-row">
                        <Text className="time-text">
                          {`${task.startTime || '--'} - ${task.endTime || '--'} | 周期${Math.floor(task.interval / 60)}分${task.interval % 60}秒`}
                        </Text>
                      </View>
                    ) : (
                      <View className="scheduled-time-row">
                        <Text className="time-text">
                          {`${task.scheduledTime || '--'} | ${task.repeatCount || 1}次 | 间隔${Math.floor(task.interval / 60)}分${task.interval % 60}秒`}
                        </Text>
                      </View>
                    )}
                    
                    {/* 右侧：删除按钮 */}
                    <Button 
                      className="delete-btn" 
                      size="mini"
                      onClick={() => {
                        Taro.showModal({
                          title: '确认删除',
                          content: '确定要删除这个任务吗？',
                          success: (res) => {
                            if (res.confirm) {
                              const isScheduled = task.playMode === 3; // PlayMode.SCHEDULED
                              
                              if (isScheduled) {
                                // 从到点播放任务中移除
                                setScheduledTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                              } else {
                                // 从循环/感应任务中移除
                                setLoopSensorTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                              }
                              
                              Taro.showToast({
                                title: '删除成功',
                                icon: 'success'
                              });
                            }
                          }
                        });
                      }}
                    >
                      删除
                    </Button>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="empty-task-list">
              暂无任务
            </View>
          )}
        </View>
        
        {/* 底部同步按钮 */}
        <View className="task-footer">
          <Button 
            className="sync-device-btn"
            onClick={syncTasksToDevice}
          >
            同步设备
          </Button>
        </View>
      </View>
    </View>
  )
}

export default ConnectionPage