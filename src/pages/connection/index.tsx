import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useReachBottom, getStorageSync } from '@tarojs/taro'
import Loading from '@/components/Loading'
import { saveConnectedDevice, clearConnectedDevice } from '@/utils/deviceUtils';
import { Device } from '@/types/device';
import './index.scss'

const ConnectionPage: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

  
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
    
    // 页面加载时尝试从缓存中恢复已连接的设备信息
    const cachedDevice = getStorageSync('connectedDevice') as Device | undefined;
    if (cachedDevice) {
      setCurrentDevice(cachedDevice);
    }
  }, []);
  
  useReachBottom(() => {
    console.log('reach connection page bottom')
  })

  const toggleLoading = () => {
    setShowLoading(!showLoading);
  };

  const handleSearchDevice = () => {
    // 显示loading组件，传入text：搜索中...
    setShowLoading(true);
    
    // 清空之前的可用设备列表
    setAvailableDevices([]);
    
    // 首先检查蓝牙权限
    Taro.getSetting({
      success: (res) => {
        console.log('权限 --- ', res);
        if (!res.authSetting['scope.bluetooth']) {
          // 请求蓝牙权限
          Taro.authorize({
            scope: 'scope.bluetooth',
            success: () => {
              // 权限获取成功后，开始搜索设备
              startDeviceDiscovery();
            },
            fail: () => {
              console.log('用户拒绝授权');
              setShowLoading(false);
            }
          });
        } else {
          // 已经有权限，直接开始搜索设备
          startDeviceDiscovery();
        }
      },
      fail: (err) => {
        console.error('获取权限设置失败:', err);
        setShowLoading(false);
      }
    });
    
    // 定义开始设备搜索的方法
    const startDeviceDiscovery = () => {
      // 监听新设备发现事件
      Taro.onBluetoothDeviceFound((res) => {
        console.log('发现新设备:', res);
        
        if (res.devices && res.devices.length > 0) {
          res.devices.forEach(device => {
            if (device.deviceId && device.name && device.connectable !== false) { // 确保设备ID、名称存在且可连接
              const newDevice: Device = {
                name: device.name || '未知设备',
                status: 'disconnected',
                RSSI: device.RSSI || 0,
                advertisData: device.advertisData || new ArrayBuffer(0),
                advertisServiceUUIDs: device.advertisServiceUUIDs || [],
                deviceId: device.deviceId,
                localName: device.localName || '',
                serviceData: device.serviceData || {},
                connectable: device.connectable !== undefined ? device.connectable : true
              };
              
              // 检查设备是否已存在于列表中
              const deviceExists = availableDevices.some(d => d.deviceId === newDevice.deviceId);
              if (!deviceExists) {
                setAvailableDevices(prev => [...prev, newDevice]);
              }
            }
          });
        }
      });
      
      // 开始搜索蓝牙设备
      Taro.startBluetoothDevicesDiscovery({
        success: (res) => {
          console.log('启动蓝牙设备搜索成功:', res);
          
          // 3秒后停止搜索
          setTimeout(() => {
            stopDeviceDiscovery();
          }, 3000);
        },
        fail: (err) => {
          console.error('启动蓝牙设备搜索失败:', err);
          setShowLoading(false);
        }
      });
    };
    
    // 定义停止设备搜索的方法
    const stopDeviceDiscovery = () => {
      Taro.stopBluetoothDevicesDiscovery({
        success: () => {
          console.log('停止蓝牙设备搜索成功');
          Taro.offBluetoothDeviceFound(); // 移除监听器
          setShowLoading(false);
        },
        fail: (err) => {
          console.error('停止蓝牙设备搜索失败:', err);
          Taro.offBluetoothDeviceFound(); // 移除监听器
          setShowLoading(false);
        }
      });
    };
  };
  
  // 连接指定设备
  const connectToDevice = (device: Device) => {
    setShowLoading(true);
    
    // 连接设备
    Taro.createBLEConnection({
      deviceId: device.deviceId,
      success: (res) => {
        console.log('连接设备成功:', res);
        
        // 设置为当前连接设备
        const connectedDevice: Device = {
          ...device,
          status: 'connected',
          RSSI: device.RSSI || 0,
          advertisData: device.advertisData || new ArrayBuffer(0),
          advertisServiceUUIDs: device.advertisServiceUUIDs || [],
          localName: device.localName || '',
          serviceData: device.serviceData || {},
          connectable: device.connectable !== undefined ? device.connectable : true
        };
        setCurrentDevice(connectedDevice);
        
        // 保存连接的设备信息到缓存，以便其他页面可以读取
        saveConnectedDevice(connectedDevice);
        
        // 清空可用设备列表
        setAvailableDevices([]);
      },
      fail: (err) => {
        console.error('连接设备失败:', err);
        // 尝试重连机制
        setTimeout(() => {
          Taro.createBLEConnection({
            deviceId: device.deviceId,
            success: (res) => {
              console.log('重连设备成功:', res);
              
              const connectedDevice: Device = {
                ...device,
                status: 'connected'
              };
              setCurrentDevice(connectedDevice);
              
              setAvailableDevices([]);
            },
            fail: (err) => {
              console.error('重连设备也失败:', err);
            }
          });
        }, 1000);
      },
      complete: () => {
        setShowLoading(false);
      }
    });
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
                // 同时清除缓存中的设备信息
                clearConnectedDevice();
                console.log('断开连接:', currentDevice.name);
              }}
            >
              断开连接
            </Button>
          )}
        </View>
      </View>
      
      {/* 可连接设备列表 */}
      {availableDevices.length > 0 && (
        <View className="section available-devices">
          <View className="section-title">可连接设备</View>
          <View className="devices-list">
            {availableDevices.map((device) => (
              <View className="device-item" key={device.deviceId}>
                <View className="device-info">
                  <Text className="device-name">{device.name || device.localName || '未知设备'}</Text>

                  <Text className="device-rssi">信号强度: {device.RSSI} dBm</Text>

                </View>
                {device.connectable !== false && <Button 
                  className="connect-btn" 
                  size="mini"
                  onClick={() => connectToDevice(device)}
                >
                  连接
                </Button>}
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* 底部搜索按钮 */}
      <Button className="search-btn" onClick={handleSearchDevice}>
        搜索设备
      </Button>
      
      <Loading visible={showLoading} text="搜索中..." />
    </View>
  )
}

export default ConnectionPage