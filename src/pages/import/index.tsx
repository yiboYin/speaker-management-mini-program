import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useReachBottom, navigateTo } from '@tarojs/taro'
import { sendCommandToDevice, getConnectedDevice, hexStringToArrayBuffer, writeCommandToDeviceWithSplit } from '@/utils/deviceUtils';
import { getDeviceId, getFilterServiceUUID, getWriteUUID } from '@/utils/bluetoothConfig';
import './index.scss'

const ImportPage: React.FC = () => {
  useReachBottom(() => {
    console.log('reach import page bottom')
  })

  // 选中文件的状态
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // 真实文件列表数据
  const [fileList, setFileList] = useState<any[]>([]);
  
  // 组件挂载时加载文件列表
  useEffect(() => {
    loadFileList();
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
    // 使用Taro.chooseMessageFile选择文件，限制为MP3格式
    if ((Taro as any).chooseMessageFile) {
      (Taro as any).chooseMessageFile({
        count: 1, // 只允许选择一个文件
        type: 'file', // 指定类型为文件
        extension: ['.mp3'], // 限制扩展名为MP3
        success: (res) => {
          console.log('选择文件成功:', res.tempFiles);
          const mp3Files = res.tempFiles.filter(file => {
            const fileName = file.name.toLowerCase();
            return fileName.endsWith('.mp3');
          });
          
          if (mp3Files.length > 0) {
            const newFiles = mp3Files.map((file, index) => {
              const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + 'MB';
              const now = new Date();
              const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
              
              return {
                id: `new_${Date.now()}_${index}`,
                name: file.name,
                size: fileSizeMB,
                date: dateStr,
                duration: '--:--', // 从文件选择器获取的文件通常不包含时长信息
                path: file.path || file.filePath || file.tempFilePath // 记录文件路径
              };
            });
            
            // 将新选择的文件添加到现有列表中
            setFileList(prevList => [...prevList, ...newFiles]);
            
            Taro.showToast({
              title: `成功添加 ${mp3Files.length} 个MP3文件`,
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
          title: `正在试听 ${selectedFile.name}`,
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
        title: `正在播放 ${selectedFile.name}`,
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
    
    // 显示正在发送的提示
    Taro.showLoading({
      title: `正在发送 ${selectedFile.name} 到设备...`
    });
      
    // 尝试读取文件的二进制内容
    let fileContentArrayBuffer: ArrayBuffer | null = null;
    
    try {
      // 尝试使用Taro的文件系统管理器读取文件
      const fs = Taro.getFileSystemManager?.();
      
      if (fs && selectedFile.path) {
        // 读取文件内容（二进制）
        const filePath = selectedFile.path;
        fileContentArrayBuffer = fs.readFileSync(filePath);
      }
    } catch (readError) {
      console.warn('读取文件内容失败:', readError);
      
      // 如果无法读取文件内容，使用文件名作为标识
      const encoder = new TextEncoder();
      fileContentArrayBuffer = encoder.encode(selectedFile.name);
    }
    
    try {
      // 第一步：发送开始传输及文件信息指令
      // 格式: 7E 02 33 [ID长度] [ID] [大小] EF
      
      // 使用文件名的哈希值或部分作为文件ID
      const fileId = generateFileId(selectedFile.name);
      const encoder = new TextEncoder();
      const idBytes = encoder.encode(fileId);
      const idLength = idBytes.length;
      
      // 文件大小（字节）转换为KB
      const fileSizeInKB = Math.ceil((selectedFile.size || 0) / 1024);
      const sizeBytes = [
        (fileSizeInKB >> 24) & 0xFF,
        (fileSizeInKB >> 16) & 0xFF,
        (fileSizeInKB >> 8) & 0xFF,
        fileSizeInKB & 0xFF
      ];
      
      // 计算整体长度：命令码(02 33) + 方向(01) + 数据部分长度
      const dataLength = 1 + idBytes.length + sizeBytes.length; // ID长度字节 + ID内容 + 大小字节
      const totalLength = 2 + 1 + dataLength; // 命令码长度(2) + 方向字节(1) + 数据长度
      
      const fileInfoCommand = [
        '7E',
        totalLength.toString(16).padStart(2, '0'), // 整体长度
        '01', // 方向：下行
        '02', // 命令码
        '33',
        idLength.toString(16).padStart(2, '0'),
        ...Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')),
        ...sizeBytes.map(b => b.toString(16).padStart(2, '0'))
      ].join(' ');
      
      console.log('发送开始传输及文件信息:', fileInfoCommand);
      await sendCommandToDevice(fileInfoCommand, (data) => {
        console.log('开始传输及文件信息响应:', data);
      });
      
      // 第三步：发送文件内容（分包发送）
      if (fileContentArrayBuffer) {
        console.log(`发送文件内容，总大小: ${fileContentArrayBuffer.byteLength} 字节`);
        
        // 使用writeCommandToDeviceWithSplit方法分包发送
        await writeCommandToDeviceWithSplit(fileContentArrayBuffer);
        
        console.log('文件内容分包发送完成');
      }
      
      // 第四步：发送结束指令
      console.log('发送结束指令: 7E 03 01 02 35');
      await sendCommandToDevice('7E 03 01 02 35', (data) => {
        console.log('结束指令响应:', data);
        
        // 检查设备是否成功接收文件
        if (data && data.resValue && data.resValue.length >= 4) {
          const responseCmd = data.resValue[1]; // 应答命令码
          const result = data.resValue[data.resValue.length - 1]; // 结果 01=成功, 00=失败
          
          if (responseCmd === 0x36 && result === 0x01) {
            Taro.hideLoading();
            Taro.showToast({
              title: '文件发送成功',
              icon: 'success',
              duration: 2000
            });
          } else {
            Taro.hideLoading();
            Taro.showToast({
              title: '文件发送失败',
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          Taro.hideLoading();
          Taro.showToast({
            title: '文件发送失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } catch (error) {
      console.error('发送文件过程出错:', error);
      Taro.hideLoading();
      Taro.showToast({
        title: '文件发送失败',
        icon: 'none',
        duration: 2000
      });
      throw error;
    }
    
    console.log(`文件 ${selectedFile.name} 发送完成`);
  };
  
  // 辅助函数：生成文件ID
  const generateFileId = (fileName: string): string => {
    // 简单的哈希函数来生成ID
    let hash = 0;
    for (let i = 0; i < fileName.length; i++) {
      const char = fileName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString();
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
  

  return (
    <View className="import-page">
      {/* 工具栏（移除绝对定位） */}
      <View className="toolbar">
        <View className="left-buttons">
          <Button className="toolbar-btn" onClick={() => {
            // 跳转到合成页面
            navigateTo({
              url: '/pages/import/synthesis/index'
            });
          }}>合成</Button>
          <Button className="toolbar-btn" onClick={selectFiles}>导入</Button>
        </View>
        <View className="right-buttons">
          <Button className="clear-btn">清空</Button>
        </View>
      </View>
      
      {/* 可滚动的文件列表区域 */}
      <ScrollView 
        className="file-list-container"
        scrollY={true}
      >
        {fileList.map(file => (
          <View 
            key={file.id} 
            className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
            onClick={() => setSelectedFileId(file.id)}
          >
            <Text className="file-name">{file.name} ({file.date})</Text>
            <Text className="file-duration">{file.duration}</Text>
            <Button 
              className="delete-btn" 
              onClick={(e) => {
                e.stopPropagation(); // 阻止点击事件冒泡到父元素
                // 删除文件逻辑
                console.log('删除文件:', file.id);
              }}
            >
              ×
            </Button>
          </View>
        ))}
      </ScrollView>
      
      {/* 底部操作按钮容器 - 仅在选中文件时显示 */}
      {selectedFileId && (
        <View className="bottom-action-container">
          <Button 
            className="action-btn send-to-device" 
            onClick={() => sendFileToDevice()}
          >
            发送到设备
          </Button>
          <Button 
            className="action-btn preview" 
            onClick={() => playSelectedFile()}
          >
            试听
          </Button>
        </View>
      )}
    </View>
  )
}

export default ImportPage