import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useReachBottom, navigateTo, useDidShow } from '@tarojs/taro'
import DeviceConnection from '@/components/DeviceConnection'
import { sendCommandToDevice, getConnectedDevice, writeCommandToDeviceWithSplit, decodeUtf8Bytes, stringToUtf8Bytes } from '@/utils/deviceUtils';
import { FILE_COMMANDS, CONTROL_COMMANDS, RESPONSE_CODES, RESULT_CODES } from '@/constants/bluetoothCommands';
import { getFilterServiceUUID, getWriteUUID, getNotifyUUID } from '@/utils/bluetoothConfig';
import './index.scss'

const ImportPage: React.FC = () => {
  useReachBottom(() => {
    console.log('reach import page bottom')
  })

  // 选中文件的状态
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  
  // 导入状态（控制按钮禁用）
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // 真实文件列表数据
  const [fileList, setFileList] = useState<any[]>([]);
  
  // 当前连接的设备
  const [currentDevice, setCurrentDevice] = useState<any>(null);
  
  // 每次页面显示时检查设备状态
  useDidShow(() => {
    console.log('Import页面显示，检查设备连接状态');
    const savedDevice = getConnectedDevice();
    if (savedDevice) {
      console.log('检测到已连接设备:', savedDevice.name);
      setCurrentDevice(savedDevice);
    } else {
      console.log('未检测到已连接设备');
      setCurrentDevice(null);
    }
  });
  
  // 组件挂载时加载文件列表
  useEffect(() => {
    // 进入页面时查询设备文件
    loadDeviceFiles();
    
    // 监听来自合成页面的事件 - 使用全局事件总线
    Taro.eventCenter.on('synthesisComplete', (data: any) => {
      console.log('收到合成的音频:', data);
      
      // 将合成的音频添加到文件列表
      const newFile = {
        id: 'synth_' + Date.now(),
        name: data.fileName,
        size: '--', // 合成文件的大小暂时不显示
        sizeInBytes: 0,
        date: new Date().toISOString().split('T')[0],
        duration: data.duration || '--:--',
        path: data.filePath,
        isSynthesized: true, // 标记为合成文件
        text: data.text, // 保存合成文本
        method: '文字合成' // 标记为文字合成
      };
      
      setFileList(prevList => [newFile, ...prevList]);
      
      // 自动选中新添加的文件
      setSelectedFileId(newFile.id);
      
      Taro.showToast({
        title: '已添加合成音频',
        icon: 'success'
      });
    });
    
    // 组件卸载时清理事件监听
    return () => {
      Taro.eventCenter.off('synthesisComplete');
    };
  }, []);
  
  const loadFileList = () => {
    // 这里应该调用实际的API获取文件列表
    // 示例: 
    // fetchFileListFromAPI()
    //   .then(files => setFileList(files))
    //   .catch(error => console.error('加载文件列表失败:', error));
    
    // 暂时设置为空数组，实际项目中应从真实API获取数据
    setFileList([]);
  };
  
  const selectFiles = () => {
    // 使用Taro.chooseMessageFile选择文件
    if ((Taro as any).chooseMessageFile) {
      (Taro as any).chooseMessageFile({
        count: 1, // 只允许选择一个文件
        type: 'file', // 指定类型为文件
        extension: [
          '.mp3', 'mp3', 
          '.wav', 'wav', 
          '.aac', 'aac', 
          '.m4a', 'm4a', 
          '.flac', 'flac'
        ], // 限制扩展名为MP3
        success: (res) => {
          console.log('选择文件成功:', res.tempFiles);
          const mp3Files = res.tempFiles.filter(file => {
            const fileName = file.name.toLowerCase();
            return fileName.endsWith('.mp3');
          });
          
          if (mp3Files.length > 0) {
            // 检查文件大小，限制为1MB以内
            const validFiles = mp3Files.filter(file => {
              const maxSize = 1 * 1024 * 1024; // 1MB = 1048576字节
              if (file.size > maxSize) {
                Taro.showToast({
                  title: `文件 ${file.name} 超过1MB限制`,
                  icon: 'none',
                  duration: 2000
                });
                return false;
              }
              return true;
            });
            
            if (validFiles.length === 0) {
              return;
            }
            
            const newFiles = validFiles.map((file, index) => {
              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + 'MB';
              const now = new Date();
              const year = now.getFullYear();
              const month = (now.getMonth() + 1).toString().padStart(2, '0');
              const day = now.getDate().toString().padStart(2, '0');
              const dateStr = year + '-' + month + '-' + day;
              
              return {
                id: 'new_' + Date.now() + '_' + index,
                name: file.name,
                size: fileSizeMB,
                sizeInBytes: file.size, // 保存原始字节数
                date: dateStr,
                duration: '--:--', // 从文件选择器获取的文件通常不包含时长信息
                path: file.path || file.filePath || file.tempFilePath, // 记录文件路径
                method: '手机导入' // 标记为手机导入
              };
            });
            
            // 将新选择的文件添加到现有列表中
            setFileList(prevList => [...prevList, ...newFiles]);
            
            Taro.showToast({
              title: '成功添加 ' + mp3Files.length + ' 个MP3文件',
              icon: 'success',
              duration: 2000
            });
          } else {
            Taro.showToast({
              title: '没有选择MP3文件',
              icon: 'none',
              duration: 2000
            });
          }
        },
        fail: (err) => {
          console.error('选择文件失败:', err);
          Taro.showModal({
            title: '提示',
            content: '无法选择文件，请检查是否授权访问文件',
            showCancel: false
          });
        }
      });
    } else {
      Taro.showModal({
        title: '提示',
        content: '当前环境不支持文件选择功能',
        showCancel: false
      });
    }
  };
  
  // 设备播放（发送蓝牙指令让设备播放文件）
  const playFileOnDevice = async () => {
    if (!selectedFileId) {
      Taro.showToast({
        title: '请先选择一个文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 查找选中的文件
    const selectedFile = fileList.find(file => file.id === selectedFileId);
    
    if (!selectedFile) {
      Taro.showToast({
        title: '找不到选中的文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查蓝牙设备是否已连接
    const device = getConnectedDevice();
    if (!device) {
      Taro.showToast({
        title: '请先连接蓝牙设备',
        icon: 'none',
        duration: 2000
      });
      navigateTo({
        url: '/pages/connection/index'
      });
      return;
    }
    
    console.log(`设备播放文件: ${selectedFile.name}`);
    
    // 构造带分隔符的文件名（例如："/1111"）
    const fileNameWithSlash = `/${selectedFile.name}`;
    
    // 构造播放指定文件的指令
    const playCommand = CONTROL_COMMANDS.PLAY_FILE(fileNameWithSlash);
    
    console.log('播放指令:', playCommand);
    console.log('文件名（含分隔符）:', fileNameWithSlash);
    
    sendCommandToDevice(playCommand, (data) => {
      // 处理播放操作的返回数据
      console.log(`设备播放返回数据:`, data);
      
      // 检查应答是否成功
      // 预期响应: 7E 04 02 02 71 01 (成功) 或 7E 04 02 02 71 00 (失败)
      if (data && data.resValue && data.resValue.length >= 5) {
        const responseCmd = data.resValue[4]; // 应该是 0x71（第5个字节）
        const result = data.resValue[5]; // 01=成功, 00=失败（第6个字节）
        
        if (responseCmd === RESPONSE_CODES.PLAY_FILE_RESULT) {
          if (result === RESULT_CODES.SUCCESS) {
            console.log('文件播放成功');
            Taro.showToast({
              title: '开始播放',
              icon: 'success',
              duration: 1500
            });
          } else {
            console.warn('文件播放失败');
            Taro.showToast({
              title: '播放失败',
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          console.warn('收到未知响应命令码:', responseCmd.toString(16));
        }
      }
      return false;
    }).then(() => {
      console.log('播放指令发送完成');
    }).catch((error) => {
      console.error('播放指令发送失败:', error);
      Taro.showToast({
        title: '播放指令发送失败',
        icon: 'none',
        duration: 2000
      });
    });
  };
  
  // 手机试听（在手机上播放音频文件）
  const playSelectedFile = () => {
    if (!selectedFileId) {
      Taro.showToast({
        title: '请先选择一个文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 查找选中的文件
    const selectedFile = fileList.find(file => file.id === selectedFileId);
    
    if (!selectedFile) {
      Taro.showToast({
        title: '找不到选中的文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 在这里实现音频播放逻辑
    console.log('准备试听文件:', selectedFile);
    
    // 使用Taro的Audio API或创建audio实例进行播放
    // 由于Taro中音频播放的具体实现可能因平台而异，这里提供一个通用的实现
    try {
      // 尝试使用Taro的createInnerAudioContext来播放选中的文件
      const audioInstance = Taro.createInnerAudioContext();
      
      // 注意：对于从chooseMessageFile获取的临时文件，需要根据具体情况设置src
      // 暂时显示提示，实际应用中需要正确设置音频源
      
      // 监听音频播放开始
      audioInstance.onPlay(() => {
        console.log('音频开始播放');
        Taro.showToast({
          title: '正在试听 ' + selectedFile.name,
          icon: 'none',
          duration: 2000
        });
      });
      
      // 监听音频播放结束
      audioInstance.onEnded(() => {
        console.log('音频播放结束');
      });
      
      // 监听播放错误
      audioInstance.onError((res) => {
        console.error('音频播放失败:', res.errMsg);
        Taro.showToast({
          title: '播放失败',
          icon: 'none',
          duration: 2000
        });
      });
      
      // 设置音频源为选中文件的路径
      if (selectedFile.path) {
        audioInstance.src = selectedFile.path;
        
        // 尝试播放音频
        audioInstance.play();
      } else {
        console.warn('文件路径不存在，无法播放');
        Taro.showToast({
          title: '文件路径错误',
          icon: 'none',
          duration: 2000
        });
      }
      
      // 显示播放提示
      Taro.showToast({
        title: '正在播放 ' + selectedFile.name,
        icon: 'none',
        duration: 2000
      });
      
    } catch (error) {
      console.error('创建音频上下文失败:', error);
      Taro.showToast({
        title: '播放功能暂不可用',
        icon: 'none',
        duration: 2000
      });
    }
  };
  
  // 同步文件到手机（从设备读取文件列表）
  const syncFilesFromDevice = async () => {
    // 检查蓝牙设备是否已连接
    const device = getConnectedDevice();
    if (!device) {
      Taro.showToast({
        title: '请先连接蓝牙设备',
        icon: 'none',
        duration: 2000
      });
      navigateTo({
        url: '/pages/connection/index'
      });
      return;
    }
    
    // 确认同步
    Taro.showModal({
      title: '确认同步',
      content: '将从设备读取文件列表并同步到手机，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          try {
            setIsImporting(true);
            Taro.showLoading({
              title: '正在同步...',
              mask: true
            });
            
            // 调用已有的loadDeviceFiles函数
            await loadDeviceFiles();
            
            Taro.hideLoading();
            setIsImporting(false);
            
            Taro.showToast({
              title: '同步成功',
              icon: 'success',
              duration: 1500
            });
          } catch (error) {
            console.error('同步文件失败:', error);
            Taro.hideLoading();
            setIsImporting(false);
            Taro.showToast({
              title: '同步失败',
              icon: 'none',
              duration: 2000
            });
          }
        }
      }
    });
  };
  
  const sendFileToDevice = async () => {
    if (!selectedFileId) {
      Taro.showToast({
        title: '请先选择一个文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 查找选中的文件
    const selectedFile = fileList.find(file => file.id === selectedFileId);
    
    if (!selectedFile) {
      Taro.showToast({
        title: '找不到选中的文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查蓝牙设备是否已连接
    const device = getConnectedDevice();
    if (!device) {
      Taro.showToast({
        title: '请先连接蓝牙设备',
        icon: 'none',
        duration: 2000
      });
      // 可以导航到连接页面
      navigateTo({
        url: '/pages/connection/index'
      });
      return;
    }
    
    // 设置导入状态为true，禁用所有按钮
    setIsImporting(true);
    
    // 显示正在发送的提示
    Taro.showLoading({
      title: '正在发送 ' + selectedFile.name + ' 到设备...'
    });
      
    // 尝试读取文件的二进制内容
    let fileContentArrayBuffer: ArrayBuffer | null = null;
    
    try {
      // 尝试使用Taro的文件系统管理器读取文件
      const getFileSystemManager = Taro.getFileSystemManager;
      const fs = getFileSystemManager ? getFileSystemManager() : null;
      
      if (fs && selectedFile.path) {
        // 读取文件内容（二进制）
        const filePath = selectedFile.path;
        const fileData = fs.readFileSync(filePath);
        // 确保返回的是 ArrayBuffer 类型
        fileContentArrayBuffer = fileData instanceof ArrayBuffer ? fileData : new ArrayBuffer(0);
      }
    } catch (readError) {
      console.warn('读取文件内容失败:', readError);
      
      // 如果无法读取文件内容，使用文件名作为标识
      fileContentArrayBuffer = stringToUtf8Bytes(selectedFile.name).buffer;
    }
    
    try {
      // 第一步：发送开始传输及文件信息指令
      Taro.showToast({
        title: '开始传输...',
        icon: 'none',
        duration: 1500
      });
      
      // 格式: 7E 02 33 [ID长度] [ID] [大小] EF
      
      // 使用文件名的哈希值或部分作为文件ID
      console.log('selectedFile.name:', selectedFile.name);
      const fileId = generateFileId(selectedFile.name);
      const idBytes = stringToUtf8Bytes(fileId);
      const idLength = idBytes.length;
      
      // 使用文件的原始字节数
      const fileSizeInBytes = selectedFile.sizeInBytes || 0;
      console.log('文件大小（字节）:', fileSizeInBytes);
      const fileSizeInKB = Math.ceil(fileSizeInBytes / 1024);
      const sizeBytes = [
        (fileSizeInKB >> 24) & 0xFF,
        (fileSizeInKB >> 16) & 0xFF,
        (fileSizeInKB >> 8) & 0xFF,
        fileSizeInKB & 0xFF
      ];
      
      // 计算整体长度：命令码(02 33) + 方向(01) + 数据部分长度
      const dataLength = 1 + idBytes.length + sizeBytes.length; // ID长度字节 + ID内容 + 大小字节
      const totalLength = 2 + 1 + dataLength; // 命令码长度(2) + 方向字节(1) + 数据长度
      
      const fileInfoCommand = FILE_COMMANDS.START_FILE_TRANSFER(
        totalLength.toString(16).padStart(2, '0'),
        idLength.toString(16).padStart(2, '0'),
        Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
        sizeBytes.map(b => b.toString(16).padStart(2, '0'))
      );
      
      console.log('发送开始传输及文件信息:', fileInfoCommand);
      Taro.showToast({
        title: `发送开始传输及文件信息`,
        icon: 'none',
        duration: 1000
      });
      
      // 等待设备应答确认
      const startTransferAck = await new Promise<boolean>((resolve, reject) => {
        let timeoutId: any;
        
        sendCommandToDevice(fileInfoCommand, (data) => {
          console.log('开始传输及文件信息响应:', data);
          
          // 清除超时定时器
          if (timeoutId) clearTimeout(timeoutId);
          
          // 检查应答是否成功
          if (data && data.resValue && data.resValue.length >= 5) {
            const responseCmd = data.resValue[4]; // 响应命令码（第5个字节）
            const result = data.resValue[data.resValue.length - 1];
            
            if (result === RESULT_CODES.SUCCESS) {
              console.log('设备确认可以开始传输');
              resolve(true);
            } else {
              console.error('设备拒绝传输');
              resolve(false);
            }
          } else {
            console.warn('收到无效应答');
            resolve(false);
          }
          
          return false; // 取消监听
        });
        
        // 设置超时保护（5秒）
        timeoutId = setTimeout(() => {
          console.error('等待设备应答超时');
          reject(new Error('等待设备应答超时'));
        }, 5000);
      });
      
      if (!startTransferAck) {
        throw new Error('设备未确认开始传输');
      }
      
      console.log('收到设备确认，开始发送文件内容');
      
      // 第三步：发送文件内容（分包发送）
      if (fileContentArrayBuffer && fileContentArrayBuffer.byteLength > 0) {
        console.log(`发送文件内容，总大小: ${fileContentArrayBuffer.byteLength} 字节`);
        
        // 获取蓝牙连接参数
        const connectedDevice = getConnectedDevice();
        if (!connectedDevice) {
          throw new Error('未找到已连接的设备');
        }
        
        const deviceId = connectedDevice.deviceId;
        const serviceUUID = getFilterServiceUUID();
        const writeUUID = getWriteUUID();
        const notifyUUID = getNotifyUUID(); // 新增：获取通知特征UUID
        
        if (!serviceUUID || !writeUUID || !notifyUUID) {
          throw new Error('未找到蓝牙服务或特征UUID');
        }
        Taro.showToast({
          title: `开始分包发送`,
          icon: 'none',
          duration: 1000
        });
        // 使用writeCommandToDeviceWithSplit方法分包发送（带应答确认）
        await writeCommandToDeviceWithSplit(
          fileContentArrayBuffer,
          deviceId,
          serviceUUID,
          writeUUID,
          notifyUUID,   // 新增：通知特征UUID，用于接收设备应答
          3000,         // 超时时间：每个包等待应答最多3秒
          20,           // 包间延迟：收到应答后延迟20ms再发送下一个包
          (progress) => {
            // 进度回调：显示当前传输进度
            Taro.showToast({
              title: `传输中 ${progress}%`,
              icon: 'none',
              duration: 1000
            });
          }
        );
        Taro.showToast({
          title: `文件内容分包发送完成`,
          icon: 'none',
          duration: 1000
        });
        console.log('文件内容分包发送完成');
      }
      
      // 第四步：发送结束指令
      console.log('发送结束指令:', FILE_COMMANDS.END_FILE_TRANSFER);
      await sendCommandToDevice(FILE_COMMANDS.END_FILE_TRANSFER, (data) => {
        console.log('结束指令响应:', data);
        
        // 检查设备是否成功接收文件
        if (data && data.resValue && data.resValue.length >= 5) {
          const responseCmd = data.resValue[4]; // 应答命令码（第5个字节）
          const result = data.resValue[data.resValue.length - 1]; // 结果 01=成功, 00=失败
          
          if (responseCmd === RESPONSE_CODES.FILE_TRANSFER_CONFIRM && result === RESULT_CODES.SUCCESS) {
            // 文件发送成功
            Taro.hideLoading();
            setIsImporting(false); // 恢复按钮状态
            
            // 删除当前选中的文件记录
            if (selectedFileId) {
              setFileList(prevList => prevList.filter(file => file.id !== selectedFileId));
              setSelectedFileId(null);
            }
            
            Taro.showToast({
              title: '文件发送成功',
              icon: 'success',
              duration: 1500,
              success: () => {
                // Toast显示完成后，重新查询设备文件列表
                setTimeout(() => {
                  loadDeviceFiles();
                }, 1500);
              }
            });
          } else {
            Taro.hideLoading();
            setIsImporting(false); // 恢复按钮状态
            Taro.showToast({
              title: '文件发送失败1',
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          Taro.hideLoading();
          setIsImporting(false); // 恢复按钮状态
          Taro.showToast({
            title: '文件发送失败2',
            icon: 'none',
            duration: 2000
          });
        }
        return false;
      });
    } catch (error) {
      console.error('发送文件过程出错:', error);
      Taro.hideLoading();
      setIsImporting(false); // 恢复按钮状态
      Taro.showToast({
        title: `文件发送失败: ${error.message}`,
        icon: 'none',
        duration: 2000
      });
      throw error;
    }
    
    console.log(`文件 ${selectedFile.name} 发送完成`);
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
  
  // 辅助函数：生成文件ID（4位随机数字）
  const generateFileId = (fileName: string): string => {
    // 生成4位随机数字（0000-9999）
    const randomNum = Math.floor(Math.random() * 10000);
    return randomNum.toString().padStart(4, '0');
  };
  
  // 辅助函数：将字符串转换为十六进制
  const convertStringToHex = (str: string): string => {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
    return hex.trim();
  };
  
  // 辅助函数：将ArrayBuffer或Uint8Array转换为十六进制字符串
  const bufferToHex = (buffer: ArrayBuffer | Uint8Array): string => {
    let hex = '';
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
    return hex.trim();
  };
  
  // 删除文件
  const handleDeleteFile = (fileId: string) => {
    console.log('删除文件:', fileId);
    
    // 查找要删除的文件
    const fileToDelete = fileList.find(file => file.id === fileId);
    if (!fileToDelete) {
      Taro.showToast({
        title: '找不到文件',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 如果是设备同步的文件，需要发送删除指令到设备
    if (fileToDelete.method === '设备同步') {
      Taro.showModal({
        title: '确认删除',
        content: `确定要从设备中删除 ${fileToDelete.name} 吗？`,
        success: (res) => {
          if (res.confirm) {
            console.log(`删除文件: ${fileToDelete.name}`);
            
            // 构造带分隔符的文件名（例如："/1111"）
            const fileNameWithSlash = `/${fileToDelete.name}`;
            
            // 构造删除文件指令
            const deleteCommand = FILE_COMMANDS.DELETE_FILE(fileNameWithSlash);
            
            console.log('删除指令:', deleteCommand);
            console.log('文件名（含分隔符）:', fileNameWithSlash);
            
            sendCommandToDevice(deleteCommand, (data) => {
              // 处理删除文件操作的返回数据
              console.log(`删除文件返回数据:`, data);
              
              // 根据协议规范，设备返回: 7E 04 02 02 73 [结果] (成功/失败)
              if (data && data.resValue && data.resValue.length >= 6) {
                const responseCmd = data.resValue[4]; // 应答命令码 应该是 0x73（第5个字节）
                const result = data.resValue[5]; // 结果 01=成功, 00=失败（第6个字节）
                
                if (responseCmd === RESPONSE_CODES.DELETE_FILE_RESULT && result === RESULT_CODES.SUCCESS) {
                  // 删除成功，从本地列表中移除该文件
                  setFileList(prevList => prevList.filter(file => file.id !== fileId));
                  
                  // 如果删除的是当前选中的文件，清空选中状态
                  if (selectedFileId === fileId) {
                    setSelectedFileId(null);
                  }
                  
                  console.log(`文件 ${fileId} 删除成功`);
                  
                  Taro.showToast({
                    title: '文件删除成功',
                    icon: 'success',
                    duration: 2000
                  });
                } else {
                  console.log(`文件 ${fileId} 删除失败`);
                  
                  Taro.showToast({
                    title: '文件删除失败',
                    icon: 'none',
                    duration: 2000
                  });
                }
              }
              return false;
            }).then(() => {
              console.log('删除文件指令发送完成');
            }).catch((error) => {
              console.error('删除文件指令发送失败:', error);
              Taro.showToast({
                title: '删除文件指令发送失败',
                icon: 'none',
                duration: 2000
              });
            });
          }
        }
      });
    } else {
      // 非设备同步的文件（文字合成、手机导入），直接从本地列表删除
      Taro.showModal({
        title: '确认删除',
        content: '确定要删除这个文件吗？',
        success: (res) => {
          if (res.confirm) {
            setFileList(prevList => prevList.filter(file => file.id !== fileId));
            
            // 如果删除的是当前选中的文件，清空选中状态
            if (selectedFileId === fileId) {
              setSelectedFileId(null);
            }
            
            Taro.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500
            });
          }
        }
      });
    }
  };
  
  // 读取设备文件列表
  const loadDeviceFiles = () => {
    console.log('读取设备文件列表');
    
    // 清空现有文件列表
    setFileList([]);
    
    // 发送指令到设备
    sendCommandToDevice(FILE_COMMANDS.READ_FILE_LIST, (data) => {
      console.log('从设备接收到数据:', data);
      
      // 解析设备返回的文件数据
      if (data.resValue && data.resValue.length >= 5) {
        const responseCmd = data.resValue[4]; // 响应命令码低位（0x31）
        
        // 检查是否是文件列表响应（0x31）
        if (responseCmd === RESPONSE_CODES.FILE_LIST_ITEM) {
          // 文件名数据从第5个字节开始
          const fileNameDataBytes = data.resValue.slice(5);
          
          // 无文件情况：数据部分只有一个 0x00 字节
          if (fileNameDataBytes.length === 1 && fileNameDataBytes[0] === 0x00) {
            console.log('设备无文件');
            setFileList([]);
            return false;
          }
          
          // 将字节数组转换为字符串
          const fileNameStr = decodeUtf8Bytes(new Uint8Array(fileNameDataBytes));
          console.log('文件名原始字符串:', fileNameStr);
          
          // 按"/"分割文件名（首字节是"/"，所以会先得到一个空串，filter 掉）
          const fileNames = fileNameStr.split('/').filter(name => name.length > 0);
          console.log('解析到的文件名:', fileNames);
          
          // 构造文件列表
          const newFileList = fileNames.map((name, index) => ({
            id: `device_${index + 1}`,
            name, // 原始文件名（不含.mp3后缀），用于数据传输
            size: '--',
            sizeInBytes: 0,
            date: new Date().toISOString().split('T')[0],
            duration: '--:--',
            path: '',
            method: '设备同步' // 标记为设备同步
          }));
          
          console.log('构造的设备文件列表:', newFileList);
          setFileList(newFileList);
          
          Taro.showToast({
            title: `获取到 ${newFileList.length} 个文件`,
            icon: 'success',
            duration: 1500
          });
        }
      }
      return false;
    }).catch((error) => {
      console.error('读取设备文件失败:', error);
      Taro.showToast({
        title: '读取设备文件失败',
        icon: 'none',
        duration: 2000
      });
    });
  };
  

  return (
    <View className="import-page">
      {/* 顶部设备连接区域 */}
      <View className="top-section">
        <DeviceConnection 
          currentDevice={currentDevice}
          onClick={() => {
            // 点击跳转到设备列表页面
            navigateTo({
              url: '/pages/connection/device-list/index'
            });
          }}
        />
      </View>
      
      {/* 工具栏 */}
      <View className="toolbar">
        <Button 
          className="toolbar-btn" 
          disabled={isImporting}
          onClick={() => {
            // 跳转到合成页面
            navigateTo({
              url: '/pages/import/synthesis/index'
            });
          }}
        >
          <Text className="btn-icon">T</Text>
          <Text>文字合成</Text>
        </Button>
        <Button 
          className="toolbar-btn" 
          disabled={isImporting}
          onClick={selectFiles}
        >
          <Text className="btn-icon">↓</Text>
          <Text>手机导入</Text>
        </Button>
        <Button 
          className="toolbar-btn" 
          disabled={isImporting}
          onClick={syncFilesFromDevice}
        >
          <Text className="btn-icon">↻</Text>
          <Text>设备同步</Text>
        </Button>
      </View>
      
      {/* 音频列表 */}
      <View className="file-list-section">
        <ScrollView 
          className="file-list-container"
          scrollY={true}
        >
          {fileList.length > 0 ? (
            fileList.map((file, index) => (
              <View 
                key={file.id} 
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
                onClick={() => setSelectedFileId(file.id)}
              >
                <View className="file-info">
                  <Text className="file-name">{file.name}</Text>
                  <Text className="file-meta">{file.method || '未知'} · 时长: {file.duration || '--'}</Text>
                </View>
                <View className="delete-btn-wrapper">
                  <Button 
                    className="delete-btn-circle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                  >
                    ×
                  </Button>
                </View>
              </View>
            ))
          ) : (
            <View className="empty-file-list">
              暂无文件
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* 底部操作按钮容器 - 仅在选中文件时显示 */}
      {selectedFileId && (() => {
        const selectedFile = fileList.find(file => file.id === selectedFileId);
        if (!selectedFile) return null;
        
        // 根据方式决定显示哪些按钮
        if (selectedFile.method === '设备同步') {
          // 设备同步的文件只显示"设备播放"按钮（发送蓝牙指令）
          return (
            <View className="bottom-action-container">
              <View className="action-spacer"></View>
              <View className="action-btn-wrapper">
                <Button 
                  className="action-btn-circle device-play" 
                  disabled={isImporting}
                  onClick={() => playFileOnDevice()}
                >
                  ▶
                </Button>
                <Text className="btn-label">设备播放</Text>
              </View>
            </View>
          );
        } else {
          // 其他方式（文字合成、手机导入）显示"发送到设备"、"快速下载"和"试听"三个按钮
          return (
            <View className="bottom-action-container">
              <View className="action-btn-wrapper">
                <Button 
                  className="action-btn-circle send-to-device" 
                  disabled={isImporting}
                  onClick={() => sendFileToDevice()}
                >
                  ↓
                </Button>
                <Text className="btn-label">下载到设备</Text>
              </View>
              <View className="action-btn-wrapper">
                <Button 
                  className="action-btn-circle quick-download" 
                  disabled={isImporting}
                  onClick={() => quickSyncToDevice()}
                >
                  ⚡
                </Button>
                <Text className="btn-label">快速下载</Text>
              </View>
              <View className="action-btn-wrapper">
                <Button 
                  className="action-btn-circle preview" 
                  disabled={isImporting}
                  onClick={() => playSelectedFile()}
                >
                  ▶
                </Button>
                <Text className="btn-label">文件试听</Text>
              </View>
            </View>
          );
        }
      })()}
    </View>
  )
}

export default ImportPage