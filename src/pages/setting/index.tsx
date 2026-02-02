import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro';
import { View, Button, Input } from '@tarojs/components';
import { sendCommandToDevice } from '@/utils/deviceUtils'; // 导入获取连接设备的函数和十六进制转换函数
import './index.scss';

const SettingPage: React.FC = () => {
  const buttons = [
    { text: '恢复出厂设置', action: 'factoryReset' },
    { text: '开关机', action: 'powerToggle' },
    { text: '灯模式', action: 'lightMode' },
    { text: '定时', action: 'schedule' },
    { text: '上电播放', action: 'powerPlay' },
    { text: '到点循环', action: 'timeLoop' },
    { text: '上一首', action: 'previous' },
    { text: '播放/停止', action: 'playPause' },
    { text: '下一首', action: 'next' },
    { text: '音量加', action: 'volumeUp' },
    { text: '音量减', action: 'volumeDown' }
  ];
  
  // 组件挂载时获取设备状态
  useEffect(() => {
    // 获取当前设备状态
    sendCommandToDevice('7E 02 10 EF', (data) => {
      console.log('初始设备状态返回数据:', data);
      
      // 解析设备状态返回数据
      // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
      if (data.resValue && data.resValue.length >= 6) {
        // 状态字节格式：[开关机][定时][上电播放][到点循环]
        const scheduleStatus = data.resValue[3]; // 定时状态在第4个字节
        const powerPlayStatus = data.resValue[4]; // 上电播放状态在第5个字节
        const timeLoopStatus = data.resValue[5]; // 到点循环状态在第6个字节
        
        // 更新本地状态
        setScheduleEnabled(scheduleStatus === 0x01);
        setPowerPlayEnabled(powerPlayStatus === 0x01);
        setTimeLoopEnabled(timeLoopStatus === 0x01);
      }
    }).catch((error) => {
      console.error('获取初始设备状态失败:', error);
    });
  }, []);
  
  const [ledText, setLedText] = useState('');
  
  interface FileItem {
    id: string;
    name: string;
    duration?: string; // 可选的时长信息
  }
  
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  
  // 添加定时、到点循环、上电播放的状态
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [timeLoopEnabled, setTimeLoopEnabled] = useState<boolean>(false);
  const [powerPlayEnabled, setPowerPlayEnabled] = useState<boolean>(false);
  


  
  
  
  

  
  const handleButtonClick = (action: string) => {
    console.log(`执行操作: ${action}`);
    
    // 根据不同的操作发送相应的指令
    let command = '';
    switch(action) {
      case 'factoryReset':
        command = '7E 04 01 02 01'; // 恢复出厂设置指令
        break;
      case 'powerToggle':
        // 先获取设备状态，然后切换开关机状态
        sendCommandToDevice('7E 03 01 02 10', (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const powerStatus = data.resValue[2]; // 开关机状态在第3个字节
            
            // 根据当前开关机状态切换
            if (powerStatus === 0x00) {
              // 当前为关机状态，发送开机指令
              command = '7E 05 01 02 02 01';
            } else {
              // 当前为开机状态，发送关机指令
              command = '7E 05 01 02 02 00';
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('开关机操作返回数据:', data);
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
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return; // 返回，避免后续执行
      case 'lightMode':
        // 灯模式循环：1 -> 2 -> 3 -> 1...
        // 由于当前没有存储灯模式的状态，暂时使用随机模式
        const randomMode = Math.floor(Math.random() * 3) + 1; // 1, 2, 或 3
        command = `7E 05 01 02 03 0${randomMode}`; // 灯模式指令
        break;
      case 'schedule':
        // 先获取当前设备状态
        sendCommandToDevice('7E 03 01 02 10', (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const scheduleStatus = data.resValue[3]; // 定时状态在第4个字节
            
            // 根据当前定时状态切换
            if (scheduleStatus === 0x00) {
              // 当前为关闭状态，发送开启指令
              command = '7E 05 01 02 04 01';
              setScheduleEnabled(true); // 更新本地状态
            } else {
              // 当前为开启状态，发送关闭指令
              command = '7E 05 01 02 04 00';
              setScheduleEnabled(false); // 更新本地状态
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('定时操作返回数据:', data);
            }).then(() => {
              Taro.showToast({
                title: scheduleStatus === 0x00 ? '定时开启成功' : '定时关闭成功',
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
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return; // 返回，避免后续执行
      case 'powerPlay':
        // 先获取当前设备状态
        sendCommandToDevice('7E 03 01 02 10', (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const powerPlayStatus = data.resValue[4]; // 上电播放状态在第5个字节
            
            // 根据当前上电播放状态切换
            if (powerPlayStatus === 0x00) {
              // 当前为关闭状态，发送开启指令
              command = '7E 05 01 02 05 01';
              setPowerPlayEnabled(true); // 更新本地状态
            } else {
              // 当前为开启状态，发送关闭指令
              command = '7E 05 01 02 05 00';
              setPowerPlayEnabled(false); // 更新本地状态
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('上电播放操作返回数据:', data);
            }).then(() => {
              Taro.showToast({
                title: powerPlayStatus === 0x00 ? '上电播放开启成功' : '上电播放关闭成功',
                icon: 'success',
                duration: 2000
              });
            }).catch((error) => {
              console.error('发送上电播放指令失败:', error);
              Taro.showToast({
                title: '发送上电播放指令失败',
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
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return; // 返回，避免后续执行
      case 'timeLoop':
        // 先获取当前设备状态
        sendCommandToDevice('7E 03 01 02 10', (data) => {
          console.log('设备状态返回数据:', data);
          
          // 解析设备状态返回数据
          // 返回格式: 7E [整体长度] 02 02 11 [状态字节]
          if (data.resValue && data.resValue.length >= 6) {
            // 状态字节格式：[开关机][定时][上电播放][到点循环]
            const timeLoopStatus = data.resValue[5]; // 到点循环状态在第6个字节
            
            // 根据当前到点循环状态切换
            if (timeLoopStatus === 0x00) {
              // 当前为关闭状态，发送开启指令
              command = '7E 05 01 02 06 01';
              setTimeLoopEnabled(true); // 更新本地状态
            } else {
              // 当前为开启状态，发送关闭指令
              command = '7E 05 01 02 06 00';
              setTimeLoopEnabled(false); // 更新本地状态
            }
            
            sendCommandToDevice(command, (data) => {
              console.log('到点循环操作返回数据:', data);
            }).then(() => {
              Taro.showToast({
                title: timeLoopStatus === 0x00 ? '到点循环开启成功' : '到点循环关闭成功',
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
        }).catch((error) => {
          console.error('获取设备状态失败:', error);
          Taro.showToast({
            title: '获取设备状态失败',
            icon: 'none',
            duration: 2000
          });
        });
        return; // 返回，避免后续执行
      case 'previous':
        command = '7E 03 01 02 07'; // 上一首指令
        break;
      case 'playPause':
        command = '7E 03 01 02 08'; // 播放/停止指令
        break;
      case 'next':
        command = '7E 03 01 02 09'; // 下一首指令
        break;
      case 'volumeUp':
        command = '7E 03 01 02 0A'; // 音量加指令
        break;
      case 'volumeDown':
        command = '7E 03 01 02 0B'; // 音量减指令
        break;
      default:
        console.log(`未知操作: ${action}`);
        return;
    }
    
    // 发送指令到设备
    sendCommandToDevice(command, (data) => {
      // 处理接收到的数据
      console.log(`${action}操作返回数据:`, data);
      
      // 如果是读取文件列表的操作，根据返回数据更新文件列表
      if (action === 'readFiles' && data.resValue && data.resValue.length >= 2) {
        // 获取resValue数组倒数第二位的值，表示文件数量
        const fileCountIndex = data.resValue.length - 2;
        const fileCount = data.resValue[fileCountIndex];
        
        console.log(`检测到设备上有 ${fileCount} 个文件`);
        
        // 创建fileList，文件名为“音频x”
        const newFileList = [];
        for (let i = 1; i <= fileCount; i++) {
          newFileList.push({
            id: `audio_${i}`,
            name: `音频${i}`
          });
        }
        
        setFileList(newFileList);
        console.log('更新后的文件列表:', newFileList);
      }
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
  
  const handleSendLed = () => {
    console.log(`发送LED内容: ${ledText}`);
    
    // 将文本转换为UTF-8编码的十六进制字符串
    const encoder = new TextEncoder(); // 使用TextEncoder将文本转换为UTF-8字节数组
    const textBytes = encoder.encode(ledText);
    
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
    const command = `7E ${totalLength.toString(16).padStart(2, '0')} 01 02 20 ${lengthHex} ${textHex}`;
    
    // 发送指令到设备
    sendCommandToDevice(command, (data) => {
      // 处理接收到的数据
      console.log('LED内容发送返回数据:', data);
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
    console.log(`试听第${fileIndex}个文件`);
    
    // 播放指定文件，可能需要先发送选择文件的指令，再发送播放指令
    // 由于协议中未明确规定选择特定文件的指令，这里先发送播放/停止指令
    const command = '7E 03 01 02 08'; // 播放/停止指令
    
    sendCommandToDevice(command, (data) => {
      // 处理试听操作的返回数据
      console.log(`试听第${fileIndex}个文件返回数据:`, data);
    }).then(() => {
      Taro.showToast({
        title: '试听指令发送成功',
        icon: 'success',
        duration: 2000
      });
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
    console.log(`删除文件ID: ${fileId}`);
    
    // 从文件ID中提取数字部分作为文件ID
    const fileNumber = parseInt(fileId.replace('audio_', ''), 10);
    
    // 构造删除文件指令: 7E 04 01 02 32 [文件ID]
    const command = `7E 04 01 02 32 ${fileNumber.toString(16).padStart(2, '0')}`;
    
    sendCommandToDevice(command, (data) => {
      // 处理删除文件操作的返回数据
      console.log(`删除文件返回数据:`, data);
      
      // 根据协议规范，设备返回: 7E [整体长度] 02 02 33 [结果] (成功/失败)
      if (data.resValue && data.resValue.length >= 4) {
        const responseCmd = data.resValue[1]; // 应答命令码
        const result = data.resValue[3]; // 结果 01=成功, 00=失败
        
        if (responseCmd === 0x33 && result === 0x01) {
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
    console.log('已连接设备，发送指令: 7E 02 30 EF');
      
    // 发送指令到设备
    sendCommandToDevice('7E 03 01 02 30', (data) => {
      // 处理接收到的数据
      console.log('从设备接收到数据:', data);
        
      // 解析设备返回的文件数据
      // 新协议：逐个返回单个文件，最后发送结束指令
      // 文件格式: 7E [整体长度] 02 02 31 [文件数据] 或 结束格式: 7E 03 02 02 32
      if (data.resValue && data.resValue.length >= 3) {
        const responseCmd = data.resValue[1]; // 响应命令码
              
        // 检查是否是结束指令
        if (responseCmd === 0x32) {
          // 收到结束指令，获取文件完成
          console.log('文件列表获取完成');
          return;
        }
              
        // 检查是否是文件数据指令
        if (responseCmd === 0x31 && data.resValue.length >= 4) {
          // 解析单个文件数据格式: [文件ID][文件名长度][文件名][文件大小]
          let currentIndex = 2; // 从第3个字节开始是文件数据
                
          const fileId = data.resValue[currentIndex];
          currentIndex++;
                
          if (currentIndex < data.resValue.length) {
            const fileNameLength = data.resValue[currentIndex];
            currentIndex++;
                  
            if (currentIndex + fileNameLength <= data.resValue.length) {
              // 提取文件名（UTF-8编码）
              const fileNameBytes = data.resValue.slice(currentIndex, currentIndex + fileNameLength);
              const decoder = new TextDecoder('utf-8');
              const fileName = decoder.decode(new Uint8Array(fileNameBytes));
              currentIndex += fileNameLength;
                    
              if (currentIndex + 3 < data.resValue.length) {
                // 文件大小是4字节（大端序）
                const fileSize = (data.resValue[currentIndex] << 24) |
                                 (data.resValue[currentIndex + 1] << 16) |
                                 (data.resValue[currentIndex + 2] << 8) |
                                 data.resValue[currentIndex + 3];
                      
                // 添加到现有文件列表
                setFileList(prevList => {
                  const newFileList = [...prevList, {
                    id: `audio_${fileId}`,
                    name: fileName,
                    duration: `${fileSize}KB` // 使用文件大小作为时长显示
                  }];
                  console.log('获取到的文件:', newFileList);
                  return newFileList;
                });
              }
            }
          }
        }
      }
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
  }

  return (
    <View className="setting-page">
      <View className="control-panel">
        <View className="panel-title">控制面板</View>
        <View className="button-grid">
          {buttons.map((button, index) => (
            <Button 
              key={index} 
              className={`grid-button ${
                (button.action === 'schedule' && scheduleEnabled) ||
                (button.action === 'powerPlay' && powerPlayEnabled) ||
                (button.action === 'timeLoop' && timeLoopEnabled) 
                  ? 'enabled' : ''
              }`}
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
                {file.duration && <View className="file-duration">{file.duration}</View>}
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