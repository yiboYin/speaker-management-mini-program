import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro';
import { View, Button, Input } from '@tarojs/components';
import { sendCommandToDevice } from '@/utils/deviceUtils';
import { CONTROL_COMMANDS, FILE_COMMANDS, RESPONSE_CODES, RESULT_CODES } from '@/constants/bluetoothCommands';
import './index.scss';

const SettingPage: React.FC = () => {
  const buttons = [
    { text: '恢复出厂设置', action: 'factoryReset' },
    { text: '开关机', action: 'powerToggle' },
    { text: '到点循环', action: 'timeLoop' },
    { text: '上一首', action: 'previous' },
    { text: '播放/停止', action: 'playPause' },
    { text: '下一首', action: 'next' },
    { text: '音量加', action: 'volumeUp' },
    { text: '音量减', action: 'volumeDown' },
    { text: '定时', action: 'schedule' }
  ];
  
  const [ledText, setLedText] = useState('');
  
  interface FileItem {
    id: string;
    name: string;
  }
  
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  


  
  
  
  

  
  const handleButtonClick = (action: string) => {
    console.log(`执行操作: ${action}`);
    
    // 根据不同的操作发送相应的指令
    let command = '';
    switch(action) {
      case 'factoryReset':
        command = CONTROL_COMMANDS.FACTORY_RESET;
        break;
      case 'powerToggle':
        // 先获取设备状态，然后切换开关机状态
        sendCommandToDevice(CONTROL_COMMANDS.GET_DEVICE_STATUS, (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const powerStatus = data.resValue[2]; // 开关机状态在第3个字节
            
            // 根据当前开关机状态切换
            if (powerStatus === 0x00) {
              // 当前为关机状态，发送开机指令
              command = CONTROL_COMMANDS.POWER_ON;
            } else {
              // 当前为开机状态，发送关机指令
              command = CONTROL_COMMANDS.POWER_OFF;
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('开关机操作返回数据:', data);
              return false;
            }).then(() => {
              Taro.showToast({
                title: '开关机指令发送成功',
                icon: 'success',
                duration: 2000
              });
            }).catch((error) => {
              console.error('发送开关机指令失败:', error);
              Taro.showToast({
                title: '发送开关机指令失败',
                icon: 'none',
                duration: 2000
              });
            });
          } else {
            console.error('设备状态数据格式不正确');
            Taro.showToast({
              title: '设备状态数据格式不正确',
              icon: 'none',
              duration: 2000
            });
          }
          return false; // 返回，避免后续执行
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return false; // 返回，避免执行后续的通用发送逻辑
      case 'previous':
        command = CONTROL_COMMANDS.PREVIOUS;
        break;
      case 'playPause':
        command = CONTROL_COMMANDS.PLAY_PAUSE;
        break;
      case 'next':
        command = CONTROL_COMMANDS.NEXT;
        break;
      case 'volumeUp':
        command = CONTROL_COMMANDS.VOLUME_UP;
        break;
      case 'volumeDown':
        command = CONTROL_COMMANDS.VOLUME_DOWN;
        break;
      case 'timeLoop':
        // 先获取设备状态，然后切换到点循环状态
        sendCommandToDevice(CONTROL_COMMANDS.GET_DEVICE_STATUS, (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const timeLoopStatus = data.resValue[5]; // 到点循环状态在第6个字节
            
            // 根据当前到点循环状态切换
            if (timeLoopStatus === 0x00) {
              // 当前为关闭状态，发送开启指令
              command = CONTROL_COMMANDS.TIME_LOOP_ENABLE;
            } else {
              // 当前为开启状态，发送关闭指令
              command = CONTROL_COMMANDS.TIME_LOOP_DISABLE;
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('到点循环操作返回数据:', data);
              return false;
            }).then(() => {
              Taro.showToast({
                title: '到点循环指令发送成功',
                icon: 'success',
                duration: 2000
              });
            }).catch((error) => {
              console.error('发送到点循环指令失败:', error);
              Taro.showToast({
                title: '发送到点循环指令失败',
                icon: 'none',
                duration: 2000
              });
            });
          } else {
            console.error('设备状态数据格式不正确');
            Taro.showToast({
              title: '设备状态数据格式不正确',
              icon: 'none',
              duration: 2000
            });
          }
          return false; // 返回，避免后续执行
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return false; // 返回，避免执行后续的通用发送逻辑
      case 'schedule':
        // 先获取设备状态，然后切换定时状态
        sendCommandToDevice(CONTROL_COMMANDS.GET_DEVICE_STATUS, (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const scheduleStatus = data.resValue[3]; // 定时状态在第4个字节
            
            // 根据当前定时状态切换
            if (scheduleStatus === 0x00) {
              // 当前为关闭状态，发送开启指令
              command = CONTROL_COMMANDS.SCHEDULE_ENABLE;
            } else {
              // 当前为开启状态，发送关闭指令
              command = CONTROL_COMMANDS.SCHEDULE_DISABLE;
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('定时操作返回数据:', data);
              return false;
            }).then(() => {
              Taro.showToast({
                title: '定时指令发送成功',
                icon: 'success',
                duration: 2000
              });
            }).catch((error) => {
              console.error('发送定时指令失败:', error);
              Taro.showToast({
                title: '发送定时指令失败',
                icon: 'none',
                duration: 2000
              });
            });
          } else {
            console.error('设备状态数据格式不正确');
            Taro.showToast({
              title: '设备状态数据格式不正确',
              icon: 'none',
              duration: 2000
            });
          }
          return false; // 返回，避免后续执行
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return false; // 返回，避免执行后续的通用发送逻辑
      default:
        console.log(`未知操作: ${action}`);
        return;
    }
    
    // 发送指令到设备
    sendCommandToDevice(command, (data) => {
      // 处理接收到的数据
      console.log(`${action}操作返回数据:`, data);
      
      // 注意：读取文件列表的操作由独立的 handleReadFile 函数处理
      // 这里的逻辑已被移除，因为文件列表读取有专门的处理函数
      return false;
    }).then(() => {
      Taro.showToast({
        title: '指令发送成功',
        icon: 'success',
        duration: 2000
      });
    }).catch((error) => {
      console.error('发送指令失败:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none',
        duration: 2000
      });
    });
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
  
  const handleSendLed = () => {
    console.log(`发送LED内容: ${ledText}`);
    
    // 将文本转换为UTF-8编码的十六进制字符串
    const textBytes = stringToUtf8Bytes(ledText);
    
    // 计算文本长度（字节数）
    const lengthHex = textBytes.length.toString(16).padStart(2, '0');
    
    // 将字节数组转换为十六进制字符串
    const textHex = Array.from(textBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ');
    
    // 计算整体长度：命令码(02 20) + 方向(01) + 数据部分长度
    const dataLength = 1 + textBytes.length; // 长度字节 + 文本字节数
    const totalLength = 2 + 1 + dataLength; // 命令码长度(2) + 方向字节(1) + 数据长度
    
    // 构造完整的LED发送指令
    const command = FILE_COMMANDS.SEND_LED_TEXT(
      totalLength.toString(16).padStart(2, '0'),
      lengthHex,
      textHex
    );
    
    // 发送指令到设备
    sendCommandToDevice(command, (data) => {
      // 处理接收到的数据
      console.log('LED内容发送返回数据:', data);
      return false;
    }).then(() => {
      Taro.showToast({
        title: 'LED内容发送成功',
        icon: 'success',
        duration: 2000
      });
    }).catch((error) => {
      console.error('LED内容发送失败:', error);
      Taro.showToast({
        title: 'LED内容发送失败',
        icon: 'none',
        duration: 2000
      });
    });
  };
  
  const handlePlayFile = (e: any, fileIndex: number) => {
    e.stopPropagation(); // 阻止冒泡，避免影响选中状态
    
    // 获取文件名（从fileList中）
    if (fileIndex < 1 || fileIndex > fileList.length) {
      Taro.showToast({
        title: '文件索引无效',
        icon: 'none'
      });
      return;
    }
    
    const file = fileList[fileIndex - 1];
    console.log(`试听文件: ${file.name}`);
    
    // 构造带分隔符的文件名（例如："/1111"）
    // fileName现在是"1111"格式，直接添加分隔符即可
    const fileNameWithSlash = `/${file.name}`;
    
    // 构造播放指定文件的指令
    const playCommand = CONTROL_COMMANDS.PLAY_FILE(fileNameWithSlash);
    
    console.log('播放指令:', playCommand);
    console.log('文件名（含分隔符）:', fileNameWithSlash);
    
    sendCommandToDevice(playCommand, (data) => {
      // 处理试听操作的返回数据
      console.log(`试听文件返回数据:`, data);
      
      // 检查应答是否成功
      // 预期响应: 7E 04 02 02 71 01 (成功) 或 7E 04 02 02 71 00 (失败)
      if (data && data.resValue && data.resValue.length >= 5) {
        const responseCmd = data.resValue[1]; // 应该是 0x71
        const result = data.resValue[4]; // 01=成功, 00=失败
        
        if (responseCmd === RESPONSE_CODES.PLAY_FILE_RESULT) {
          if (result === RESULT_CODES.SUCCESS) {
            console.log('文件试听成功');
            Taro.showToast({
              title: '开始试听',
              icon: 'success',
              duration: 1500
            });
          } else {
            console.warn('文件试听失败');
            Taro.showToast({
              title: '试听失败',
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
      console.log('试听指令发送完成');
    }).catch((error) => {
      console.error('试听指令发送失败:', error);
      Taro.showToast({
        title: '试听指令发送失败',
        icon: 'none',
        duration: 2000
      });
    });
  };
  
  const handleDeleteFile = (e: any, fileId: string) => {
    e.stopPropagation(); // 阻止冒泡，避免影响选中状态
    
    // 从fileList中获取文件名
    const file = fileList.find(f => f.id === fileId);
    if (!file) {
      Taro.showToast({
        title: '文件不存在',
        icon: 'none'
      });
      return;
    }
    
    console.log(`删除文件: ${file.name}`);
    
    // 构造带分隔符的文件名（例如："/1111"）
    // fileName现在是"1111"格式，直接添加分隔符即可
    const fileNameWithSlash = `/${file.name}`;
    
    // 构造删除文件指令
    const command = FILE_COMMANDS.DELETE_FILE(fileNameWithSlash);
    
    console.log('删除指令:', command);
    console.log('文件名（含分隔符）:', fileNameWithSlash);
    
    sendCommandToDevice(command, (data) => {
      // 处理删除文件操作的返回数据
      console.log(`删除文件返回数据:`, data);
      
      // 根据协议规范，设备返回: 7E 04 02 02 73 [结果] (成功/失败)
      if (data.resValue && data.resValue.length >= 5) {
        const responseCmd = data.resValue[1]; // 应答命令码 应该是 0x73
        const result = data.resValue[4]; // 结果 01=成功, 00=失败
        
        if (responseCmd === RESPONSE_CODES.DELETE_FILE_RESULT && result === RESULT_CODES.SUCCESS) {
          // 删除成功，从本地列表中移除该文件
          setFileList(prevList => prevList.filter(file => file.id !== fileId));
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
  };

  const handleReadFile = () => {
    // 已连接设备，向设备发送指令
    console.log('已连接设备，发送指令:', FILE_COMMANDS.READ_FILE_LIST);
      
    // 清空现有文件列表
    setFileList([]);
      
    // 发送指令到设备
    sendCommandToDevice(FILE_COMMANDS.READ_FILE_LIST, (data) => {
      // 处理接收到的数据
      console.log('从设备接收到数据:', data);
        
      // 解析设备返回的文件数据
      // 协议（一次性返回所有文件名，用"/"分隔）：
      //   帧结构: 7E [整体长度] [方向=02] [命令码高=02] [命令码低=31] [文件名数据...]
      //   文件名不含后缀，每个文件名前带一个 "/"
      //   示例(两个文件 1111 / 0000):
      //     7E 0D 02 02 31 2F 31 31 31 31 2F 30 30 30 30
      //   无文件时: 7E 04 02 02 31 00
      if (data.resValue && data.resValue.length >= 5) {
        const responseCmd = data.resValue[4]; // 响应命令码低位（0x31）

        // 检查是否是文件列表响应（0x31）
        if (responseCmd === RESPONSE_CODES.FILE_LIST_ITEM) {
          // 文件名数据从第5个字节开始（跳过 7E 长度 方向 命令码高 命令码低）
          const fileNameDataBytes = data.resValue.slice(5);

          // 无文件情况：数据部分只有一个 0x00 字节
          if (fileNameDataBytes.length === 1 && fileNameDataBytes[0] === 0x00) {
            console.log('设备无文件');
            setFileList([]);
            Taro.showToast({
              title: '设备中暂无文件',
              icon: 'none',
              duration: 1500
            });
            return false;
          }

          // 将字节数组转换为字符串
          // ⚠️ 不使用 TextDecoder —— 微信小程序真机很多版本不支持，会抛 ReferenceError
          // 手动实现 UTF-8 解码，兼容纯 ASCII（文件ID）和中文文件名
          const decodeUtf8Bytes = (bytes: Uint8Array): string => {
            let result = '';
            let i = 0;
            while (i < bytes.length) {
              const b1 = bytes[i++];
              if (b1 < 0x80) {
                // 单字节 ASCII
                result += String.fromCharCode(b1);
              } else if (b1 < 0xE0) {
                // 2 字节
                const b2 = bytes[i++];
                result += String.fromCharCode(((b1 & 0x1F) << 6) | (b2 & 0x3F));
              } else if (b1 < 0xF0) {
                // 3 字节（中文常用）
                const b2 = bytes[i++];
                const b3 = bytes[i++];
                result += String.fromCharCode(((b1 & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F));
              } else {
                // 4 字节（emoji 等，转 UTF-16 代理对）
                const b2 = bytes[i++];
                const b3 = bytes[i++];
                const b4 = bytes[i++];
                const codePoint = ((b1 & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F);
                const adjusted = codePoint - 0x10000;
                result += String.fromCharCode(0xD800 + (adjusted >> 10), 0xDC00 + (adjusted & 0x3FF));
              }
            }
            return result;
          };
          const fileNameStr = decodeUtf8Bytes(new Uint8Array(fileNameDataBytes));

          console.log('文件名原始字符串:', fileNameStr);

          // 按"/"分割文件名（首字节是"/"，所以会先得到一个空串，filter 掉）
          const fileNames = fileNameStr.split('/').filter(name => name.length > 0);

          console.log('解析到的文件名:', fileNames);

          // 构造文件列表
          const newFileList = fileNames.map((name, index) => ({
            id: `audio_${index + 1}`,
            name: name // 不添加.mp3后缀，直接使用原始文件名
          }));

          console.log('构造的文件列表:', newFileList);
          setFileList(newFileList);

          Taro.showToast({
            title: `获取到 ${newFileList.length} 个文件`,
            icon: 'success',
            duration: 1500
          });
        }
      }
      return false;
    }).then(() => {
      console.log('读取文件指令发送完成');
    }).catch((error) => {
      console.error('发送指令失败:', error);
      Taro.showToast({
        title: '发送指令失败',
        icon: 'none',
        duration: 2000
      });
    });
  }

  return (
    <View className="setting-page">
      <View className="control-panel">
        <View className="panel-title">控制面板</View>
        <View className="button-grid">
          {buttons.map((button, index) => (
            <Button 
              key={index} 
              className="grid-button"
              onClick={() => handleButtonClick(button.action)}
            >
              {button.text}
            </Button>
          ))}
        </View>
      </View>
      
      {/* LED屏幕 */}
      <View className="led-screen">
        <View className="led-title">LED屏幕</View>
        <View className="led-input-container">
          <Input 
            className="led-input" 
            placeholder="输入LED屏幕显示内容" 
            value={ledText}
            onInput={(e) => setLedText(e.detail.value)}
          />
          <Button className="send-led-btn" onClick={handleSendLed}>发送</Button>
        </View>
      </View>
      
      <View className="file-list-section">
        <View className="file-list-header">
          <View className="section-title">文件列表</View>
          <Button 
            className="read-file-btn"
            onClick={handleReadFile}
          >
            读取文件
          </Button>
        </View>
        <View className="file-list-container">
          {fileList.length > 0 ? (
            fileList.map((file, index) => (
              <View 
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
                key={file.id}
                onClick={() => setSelectedFileId(file.id === selectedFileId ? null : file.id)}
              >
                <View className="file-name">{file.name}</View>
                <Button 
                  className="play-btn"
                  onClick={(e) => handlePlayFile(e, index + 1)}
                >
                  试听
                </Button>
                <Button 
                  className="delete-btn"
                  onClick={(e) => handleDeleteFile(e, file.id)}
                >
                  删除
                </Button>
              </View>
            ))
          ) : (
            <View className="empty-file-list">
              暂无文件
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default SettingPage;