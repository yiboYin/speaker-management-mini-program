import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useReachBottom, getStorageSync, setStorageSync } from '@tarojs/taro'
import Loading from '@/components/Loading'
import './index.scss'

interface Device {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
}

const ConnectionPage: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [historyDevices, setHistoryDevices] = useState<Device[]>([]);
  
  // 初始化蓝牙模块
  useEffect(() => {
    Taro.openBluetoothAdapter({
      success: (res) => {
        console.log('蓝牙模块初始化成功:', res);
      },
      fail: (err) => {
        console.error('蓝牙模块初始化失败:', err);
      }
    });
    
    // 模拟当前连接设备
    const mockCurrentDevice: Device = {
      id: 'device-001',
      name: 'JHY-SMART001',
      status: 'connected'
    };
    setCurrentDevice(mockCurrentDevice);
  }, []);
  
  useReachBottom(() => {
    console.log('reach connection page bottom')
  })

  useEffect(() => {
    // 页面进入时获取本地历史记录
    try {
      const cachedHistoryDevices: Device[] = getStorageSync('connectedDict') || [
        { id: 'device-1', name: 'JHY-SMART001', status: 'disconnected' },
        { id: 'device-2', name: 'JHY-SMART002', status: 'disconnected' },
        { id: 'device-3', name: 'JHY-SMART003', status: 'disconnected' }
      ];
      setHistoryDevices(cachedHistoryDevices);
    } catch (error) {
      console.error('获取本地缓存失败:', error);
      setHistoryDevices([
        { id: 'device-1', name: 'JHY-SMART001', status: 'disconnected' },
        { id: 'device-2', name: 'JHY-SMART002', status: 'disconnected' },
        { id: 'device-3', name: 'JHY-SMART003', status: 'disconnected' }
      ]);
    }
  }, []);

  const toggleLoading = () => {
    setShowLoading(!showLoading);
  };

  const handleSearchDevice = () => {
    // 显示loading组件，传入text：搜索中...
    setShowLoading(true);
    
    // 首先检查蓝牙权限
    Taro.getSetting({
      success: (res) => {
        console.log('权限 --- ', res);
        if (!res.authSetting['scope.bluetooth']) {
          // 请求蓝牙权限
          Taro.authorize({
            scope: 'scope.bluetooth',
            success: () => {
              // 权限获取成功后，再调用 getBluetoothDevices
              getBluetoothDevices();
            },
            fail: () => {
              console.log('用户拒绝授权');
              setShowLoading(false);
            }
          });
        } else {
          // 已经有权限，直接调用 getBluetoothDevices
          getBluetoothDevices();
        }
      },
      fail: (err) => {
        console.error('获取权限设置失败:', err);
        setShowLoading(false);
      }
    });
    
    // 定义获取蓝牙设备的方法
    const getBluetoothDevices = () => {
      // 先启动蓝牙设备搜索
      Taro.startBluetoothDevicesDiscovery({
        success: (res) => {
          console.log('启动蓝牙设备搜索成功:', res);
          
          // 启动搜索后，再获取设备
          Taro.getBluetoothDevices({
            success: (res) => {
              console.log('获取蓝牙设备成功:', res, res.devices);
              
              // 如果有已连接的设备，设置为当前连接设备
              if (res.devices && res.devices.length > 0) {
                const connectedDevice = res.devices[0]; // 取第一个已连接设备
                const foundDevice: Device = {
                  id: connectedDevice.deviceId || 'unknown-id',
                  name: connectedDevice.name || '未知设备',
                  status: 'connected'
                };
                
                // 设置为当前连接设备
                setCurrentDevice(foundDevice);
                
                // 将找到的设备添加到历史设备列表（如果不存在）或移动到首位（如果已存在）
                const existingIndex = historyDevices.findIndex(device => device.id === foundDevice.id);
                let updatedHistoryDevices = [...historyDevices];
                
                if (existingIndex !== -1) {
                  // 设备已存在，移除并添加到首位
                  updatedHistoryDevices.splice(existingIndex, 1);
                  updatedHistoryDevices.unshift(foundDevice);
                } else {
                  // 设备不存在，添加到首位
                  updatedHistoryDevices.unshift(foundDevice);
                }
                
                setHistoryDevices(updatedHistoryDevices);
                setStorageSync('connectedDict', updatedHistoryDevices);
              } else {
                // 没有找到已连接的设备
                setCurrentDevice(null);
                console.log('未找到已连接的蓝牙设备');
              }
              
              // 停止蓝牙设备搜索
              Taro.stopBluetoothDevicesDiscovery({
                success: () => {
                  console.log('停止蓝牙设备搜索成功');
                },
                fail: (err) => {
                  console.error('停止蓝牙设备搜索失败:', err);
                }
              });
              
              setShowLoading(false);
            },
            fail: (err) => {
              console.error('获取蓝牙设备失败:', err);
              
              // 停止蓝牙设备搜索
              Taro.stopBluetoothDevicesDiscovery({
                success: () => {
                  console.log('停止蓝牙设备搜索成功');
                },
                fail: (err) => {
                  console.error('停止蓝牙设备搜索失败:', err);
                }
              });
              
              setShowLoading(false);
            }
          });
        },
        fail: (err) => {
          console.error('启动蓝牙设备搜索失败:', err);
          setShowLoading(false);
        }
      });
    };
  };

  return (
    <View className="connection-page">
      {/* 当前连接设备 */}
      <View className="section">
        <View className="connection-area">
          <View className="connection-content">
            <View className="connection-icon">
              <Text>{currentDevice ? '🎧' : '📡'}</Text>
            </View>
            <View className="connection-text">
              {currentDevice ? currentDevice.name : '请搜索并连接蓝牙设备'}
            </View>
          </View>
          
          {currentDevice && (
            <Button 
              className="disconnect-btn" 
              onClick={() => {
                setCurrentDevice(null);
                console.log('断开连接:', currentDevice.name);
              }}
            >
              断开连接
            </Button>
          )}
        </View>
      </View>
      
      {/* 底部搜索按钮 */}
      <Button className="search-btn" onClick={handleSearchDevice}>
        搜索设备
      </Button>
      
      <Loading visible={showLoading} text="搜索中..." />
    </View>
  )
}

export default ConnectionPage