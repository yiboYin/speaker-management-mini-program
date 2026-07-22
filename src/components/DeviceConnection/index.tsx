import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Device } from '@/types/device'
import bluetoothIcon from '@/assets/images/bluetooth-icon.png'
import './index.scss'

interface DeviceConnectionProps {
  currentDevice: Device | null
  onClick?: () => void
}

const DeviceConnection: React.FC<DeviceConnectionProps> = ({ currentDevice, onClick }) => {
  // 根据RSSI计算信号强度等级（0-4）
  const getSignalLevel = (rssi: number): number => {
    if (rssi >= -50) return 4
    if (rssi >= -60) return 3
    if (rssi >= -70) return 2
    if (rssi >= -80) return 1
    return 0
  }

  // 渲染信号强度条
  const renderSignalBars = (level: number) => {
    return (
      <View className="signal-bars">
        {[1, 2, 3, 4].map((bar) => (
          <View 
            key={bar} 
            className={`signal-bar ${bar <= level ? 'active' : ''}`}
            style={{ height: `${4 + bar * 2}px` }}
          />
        ))}
      </View>
    )
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // 默认行为：跳转到设备列表页面
      Taro.navigateTo({
        url: '/pages/connection/device-list/index'
      })
    }
  }

  return (
    <View className="device-connection" onClick={handleClick}>
      <View className="bluetooth-icon">
        <Image 
          className="icon-image" 
          src={bluetoothIcon} 
          mode="aspectFit"
        />
      </View>
      
      <View className="device-info">
        {currentDevice ? (
          <>
            <Text className="device-name">{currentDevice.name || currentDevice.localName || '未知设备'}</Text>
            <View className="signal-info">
              <Text className="signal-label">信号强度</Text>
              {renderSignalBars(getSignalLevel(currentDevice.RSSI || 0))}
            </View>
          </>
        ) : (
          <Text className="device-name">未连接设备</Text>
        )}
      </View>
      
      <View className="arrow-icon">
        <Text>›</Text>
      </View>
    </View>
  )
}

export default DeviceConnection
