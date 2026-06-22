import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { sendCommandToDevice, decodeUtf8Bytes } from '@/utils/deviceUtils';
import { CONTROL_COMMANDS, FILE_COMMANDS, RESPONSE_CODES, RESULT_CODES } from '@/constants/bluetoothCommands';
import './index.scss';

interface FileItem {
  id: string;
  name: string; // 原始文件名，用于数据传输
  displayName: string; // 展示用的文件名（文件1、文件2...）
  path: string;
}

interface FileSelectorModalProps {
  visible: boolean;
  selectedFileId: string;
  onSelect: (fileId: string) => void;
  onConfirm: (selectedFile: FileItem | null) => void;
  onCancel: () => void;
}

const FileSelectorModal: React.FC<FileSelectorModalProps> = ({
  visible,
  selectedFileId,
  onSelect,
  onConfirm,
  onCancel
}) => {
  const [previewingFileId, setPreviewingFileId] = useState<string>(''); // 正在预览的文件ID
  const [files, setFiles] = useState<FileItem[]>([]); // 文件列表
  const [loading, setLoading] = useState(false); // 加载状态
  
  // 获取文件列表
  const fetchFileList = async () => {
    if (loading) return; // 防止重复请求
      
    setLoading(true);
    console.log('开始获取文件列表...');
    
    try {
      // 发送读取文件列表指令
      await sendCommandToDevice(FILE_COMMANDS.READ_FILE_LIST, (data) => {
        console.log('接收到的数据:', data);
          
        // 检查响应数据
        if (data.resValue && data.resValue.length >= 5) {
          const responseCmd = data.resValue[4]; // 响应命令码（第5个字节）
            
          // 如果是文件列表响应（0x31）
          if (responseCmd === RESPONSE_CODES.FILE_LIST_ITEM) {
            // 新协议：一次性返回所有文件名，用"/"分隔
            // 格式: 7E [整体长度] 02 02 31 [文件名数据]
            // 文件名不包含后缀，每个文件名前面包含一个分隔符"/"
            // 例如: 2F 31 31 31 31 2F 30 30 30 30 表示 "/1111/0000"
              
            // 从第5个字节开始是文件名数据（跳过帧头、长度、方向、固定值、响应码）
            const fileNameDataBytes = data.resValue.slice(5);
              
            // 将字节数组转换为字符串
            const fileNameStr = decodeUtf8Bytes(new Uint8Array(fileNameDataBytes));
              
            console.log('文件名原始字符串:', fileNameStr);
              
            // 按"/"分割文件名
            const fileNames = fileNameStr.split('/').filter(name => name.length > 0);
              
            console.log('解析到的文件名:', fileNames);
              
            // 构造文件列表
            const fileList: FileItem[] = fileNames.map((name, index) => ({
              id: `file_${String(index + 1).padStart(2, '0')}`,
              name: name, // 原始文件名，用于数据传输
              displayName: `文件${index + 1}`, // 展示用名称
              path: '' // 硬件文件不需要本地路径
            }));
              
            console.log('构造的文件列表:', fileList);
            setFiles(fileList);
            setLoading(false);
              
            if (fileList.length === 0) {
              Taro.showToast({
                title: '暂无文件',
                icon: 'none'
              });
            }
          } else {
            console.warn('收到未知的响应命令码:', responseCmd.toString(16));
            setLoading(false);
            Taro.showToast({
              title: '获取文件列表失败',
              icon: 'none'
            });
          }
        } else {
          console.warn('收到无效的响应数据');
          setLoading(false);
          Taro.showToast({
            title: '获取文件列表失败',
            icon: 'none'
          });
        }
      });
        
    } catch (error) {
      console.error('获取文件列表失败:', error);
      setLoading(false);
      Taro.showToast({
        title: '获取文件列表失败',
        icon: 'none'
      });
    }
  };

  // 试听音频（发送指令给硬件设备播放）
  const playAudio = async (fileId: string, fileName: string) => {
    // 如果正在预览同一个文件，则停止
    if (previewingFileId === fileId) {
      stopPreview();
      return;
    }
    
    // 停止之前的预览
    stopPreview();
    
    try {
      console.log('发送试听指令到硬件设备:', { fileId, fileName });
      
      // 构造带分隔符的文件名（例如："/1111"）
      // fileName现在是"1111"格式，直接添加分隔符即可
      const fileNameWithSlash = `/${fileName}`;
      
      // 构造播放指定文件的指令
      const playCommand = CONTROL_COMMANDS.PLAY_FILE(fileNameWithSlash);
      
      console.log('播放指令:', playCommand);
      console.log('文件名（含分隔符）:', fileNameWithSlash);
      
      // 发送蓝牙指令到设备，并等待响应
      await new Promise<boolean>((resolve, reject) => {
        let timeoutId: any;
        
        sendCommandToDevice(playCommand, (data) => {
          console.log('设备响应:', data);
          
          // 清除超时定时器
          if (timeoutId) clearTimeout(timeoutId);
          
          // 检查应答是否成功
          // 预期响应: 7E 04 02 02 71 01 (成功) 或 7E 04 02 02 71 00 (失败)
          if (data && data.resValue && data.resValue.length >= 5) {
            const responseCmd = data.resValue[4]; // 应该是 0x71（第5个字节）
            const result = data.resValue[5]; // 01=成功, 00=失败（第6个字节）
            
            if (responseCmd === RESPONSE_CODES.PLAY_FILE_RESULT) {
              if (result === RESULT_CODES.SUCCESS) {
                console.log('文件试听成功');
                resolve(true);
              } else {
                console.warn('文件试听失败');
                resolve(false);
              }
            } else {
              console.warn('收到未知响应命令码:', responseCmd.toString(16));
              resolve(false);
            }
          } else {
            console.warn('收到无效应答');
            resolve(false);
          }
          
          return false; // 取消监听
        });
        
        // 设置超时保护（3秒）
        timeoutId = setTimeout(() => {
          console.error('等待试听应答超时');
          reject(new Error('等待试听应答超时'));
        }, 3000);
      }).then((success) => {
        if (success) {
          setPreviewingFileId(fileId);
          
          Taro.showToast({
            title: '开始试听',
            icon: 'success'
          });
          
          // 模拟播放结束（实际应该监听硬件返回的状态）
          setTimeout(() => {
            setPreviewingFileId('');
          }, 5000); // 假设播放5秒后自动结束
        } else {
          Taro.showToast({
            title: '试听失败',
            icon: 'none'
          });
        }
      }).catch((error) => {
        console.error('发送试听指令失败:', error);
        Taro.showToast({
          title: '发送指令失败',
          icon: 'none'
        });
      });
      
    } catch (error) {
      console.error('发送试听指令异常:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none'
      });
    }
  };
  
  // 停止预览
  const stopPreview = async () => {
    if (previewingFileId) {
      try {
        console.log('发送停止指令到硬件设备');
        
        // 发送停止播放指令
        await sendCommandToDevice(CONTROL_COMMANDS.STOP_PLAY, (data) => {
          console.log('停止响应:', data);
        });
        
        setPreviewingFileId('');
        
        Taro.showToast({
          title: '已停止播放',
          icon: 'none'
        });
      } catch (error) {
        console.error('发送停止指令失败:', error);
      }
    }
  };
  
  // 监听弹窗显示状态，每次打开时获取文件列表
  useEffect(() => {
    if (visible && files.length === 0) {
      // 弹窗打开且文件列表为空时，获取文件列表
      fetchFileList();
    } else if (!visible) {
      // 弹窗关闭时，清空文件列表和预览状态
      setFiles([]);
      setPreviewingFileId('');
    }
  }, [visible]);

  // 导出当前文件列表供父组件使用
  useEffect(() => {
    if (visible && files.length > 0) {
      // 当文件列表加载完成后，通知父组件
      console.log('文件列表已加载:', files);
    }
  }, [files, visible]);

  if (!visible) return null;

  return (
    <View className="file-modal-overlay" onClick={onCancel}>
      <View className="file-modal" onClick={(e) => e.stopPropagation()}>
        <View className="modal-header">
          <Text className="modal-title">选择音频文件</Text>
          <Text className="close-btn" onClick={onCancel}>×</Text>
        </View>
        
        <ScrollView className="file-list" scrollY>
          {loading ? (
            <View className="loading-container">
              <Text className="loading-text">正在获取文件列表...</Text>
            </View>
          ) : files.length === 0 ? (
            <View className="empty-container">
              <Text className="empty-text">暂无文件</Text>
            </View>
          ) : (
            files.map((file) => (
              <View 
                key={file.id}
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`}
                onClick={() => onSelect(file.id)}
              >
                <View className="file-info">
                  <Text className="file-name">{file.displayName}</Text>
                </View>
                
                <View className="file-actions">
                  <Button 
                    className={`action-btn preview-btn ${previewingFileId === file.id ? 'playing' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(file.id, file.name);
                    }}
                  >
                    {previewingFileId === file.id ? '停止' : '试听'}
                  </Button>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        
        <View className="modal-footer">
          <Button className="cancel-btn" onClick={onCancel}>取消</Button>
          <Button 
            className="confirm-btn" 
            onClick={() => {
              const selectedFile = files.find(f => f.id === selectedFileId) || null;
              onConfirm(selectedFile);
            }}
          >
            选择
          </Button>
        </View>
      </View>
    </View>
  );
};

export default FileSelectorModal;
