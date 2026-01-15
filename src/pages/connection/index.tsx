import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { useReachBottom, getStorageSync, setStorageSync } from '@tarojs/taro'
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
  
  // 模拟当前连接设备
  useEffect(() => {
    // 这里可以替换为实际的蓝牙连接逻辑
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
    
    // 模拟搜索设备的过程
    setTimeout(() => {
      // 模拟搜索到一个设备
      const foundDevice: Device = {
        id: 'device-100',
        name: 'JHY-SMART004',
        status: 'connected'
      };
      
      // 如果当前没有连接设备，直接设置为当前连接设备
      if (!currentDevice) {
        setCurrentDevice(foundDevice);
      } else {
        // 如果已经有一个连接设备，断开当前连接
        setCurrentDevice(null);
      }
      
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
      
      setShowLoading(false);
    }, 3000); // 3秒后关闭loading
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