import React, { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Loading from '@/components/Loading'
import { saveConnectedDevice, sendCurrentTimeToDevice } from '@/utils/deviceUtils'
import { Device } from '@/types/device'
import { getDeviceId, setDeviceId, getFilterDeviceName, setFilterDeviceName, getFilterServiceUUID, setFilterServiceUUID, getNotifyUUID, setNotifyUUID, getWriteUUID, setWriteUUID, getServiceUUID, setServiceUUID } from '@/utils/bluetoothConfig'
import './index.scss'

const DeviceListPage: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false)
  const [availableDevices, setAvailableDevices] = useState<Device[]>([])
  const [bluetoothInitialized, setBluetoothInitialized] = useState(false)

  // 初始化蓝牙适配器
  const initBluetoothAdapter = (callback?: () => void) => {
    Taro.openBluetoothAdapter({
      success: (res) => {
        console.log('蓝牙模块初始化成功:', res)
        setBluetoothInitialized(true)
        if (callback) {
          callback()
        }
      },
      fail: (err) => {
        console.error('蓝牙模块初始化失败:', err)
        setShowLoading(false)
        Taro.showToast({
          title: '蓝牙初始化失败，请检查蓝牙设置',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }

  // 初始化蓝牙（支持重新初始化）
  const initBluetooth = (callback?: () => void) => {
    if (bluetoothInitialized) {
      Taro.closeBluetoothAdapter({
        success: () => {
          console.log('蓝牙适配器关闭成功')
          initBluetoothAdapter(callback)
        },
        fail: () => {
          initBluetoothAdapter(callback)
        }
      })
    } else {
      initBluetoothAdapter(callback)
    }
  }

  // 获取设备服务和特征值信息
  const getDeviceServicesAndCharacteristics = (device: Device, callback?: () => void) => {
    Taro.getBLEDeviceServices({
      deviceId: device.deviceId,
      success: (servicesRes) => {
        console.log('获取设备服务成功:', servicesRes)
        
        const nonSystemServices = servicesRes.services.filter(service => 
          !service.uuid.startsWith('000018')
        )
        
        if (nonSystemServices.length > 0) {
          const firstNonSystemService = nonSystemServices[0]
          
          Taro.getBLEDeviceCharacteristics({
            deviceId: device.deviceId,
            serviceId: firstNonSystemService.uuid,
            success: (characteristicsRes) => {
              console.log('获取服务特征值成功:', characteristicsRes)
              
              const writeCharacteristic = characteristicsRes.characteristics.find(char => 
                char.properties.write
              )
              
              const notifyCharacteristic = characteristicsRes.characteristics.find(char => 
                char.properties.notify || char.properties.indicate
              )
              
              setServiceUUID(nonSystemServices.map(service => service.uuid))
              if (writeCharacteristic) {
                setWriteUUID(writeCharacteristic.uuid)
              }
              if (notifyCharacteristic) {
                setNotifyUUID(notifyCharacteristic.uuid)
                
                Taro.notifyBLECharacteristicValueChange({
                  deviceId: device.deviceId,
                  serviceId: firstNonSystemService.uuid,
                  characteristicId: notifyCharacteristic.uuid,
                  state: true,
                  success: (notifyResult) => {
                    console.log('启用notify监听成功:', notifyResult)
                  },
                  fail: (error) => {
                    console.error('启用notify监听失败:', error)
                  }
                })
              }
              setFilterServiceUUID(firstNonSystemService.uuid)
              setFilterDeviceName(device.name || device.localName || '')
              setDeviceId(device.deviceId)
              
              console.log('已更新蓝牙配置:', {
                serviceUUID: nonSystemServices.map(service => service.uuid),
                writeUUID: writeCharacteristic ? writeCharacteristic.uuid : '',
                notifyUUID: notifyCharacteristic ? notifyCharacteristic.uuid : '',
                filterServiceUUID: firstNonSystemService.uuid,
                filterDeviceName: device.name || device.localName || '',
                deviceId: device.deviceId
              })
              
              if (callback) {
                callback()
              }
            },
            fail: (charErr) => {
              console.error('获取服务特征值失败:', charErr)
              
              setServiceUUID(nonSystemServices.map(service => service.uuid))
              setFilterServiceUUID(firstNonSystemService.uuid)
              setFilterDeviceName(device.name || device.localName || '')
              setDeviceId(device.deviceId)
              
              if (callback) {
                callback()
              }
            }
          })
        } else {
          if (servicesRes.services.length > 0) {
            const firstService = servicesRes.services[0]
            setFilterServiceUUID(firstService.uuid)
            setFilterDeviceName(device.name || device.localName || '')
            setDeviceId(device.deviceId)
            
            if (callback) {
              callback()
            }
          }
        }
      },
      fail: (servicesErr) => {
        console.error('获取设备服务失败:', servicesErr)
        
        if (callback) {
          callback()
        }
      }
    })
  }

  // 连接指定设备
  const connectToDevice = (device: Device) => {
    setShowLoading(true)
    
    Taro.createBLEConnection({
      deviceId: device.deviceId,
      success: (res) => {
        console.log('连接设备成功:', res)
        
        const connectedDevice: Device = {
          ...device,
          status: 'connected',
          RSSI: device.RSSI || 0,
          advertisData: device.advertisData || new ArrayBuffer(0),
          advertisServiceUUIDs: device.advertisServiceUUIDs || [],
          localName: device.localName || '',
          serviceData: device.serviceData || {},
          connectable: device.connectable !== undefined ? device.connectable : true
        }
        
        saveConnectedDevice(connectedDevice)
        
        getDeviceServicesAndCharacteristics(device, () => {
          setTimeout(() => {
            sendCurrentTimeToDevice().then((success) => {
              if (success) {
                console.log('时间同步成功')
              } else {
                console.warn('时间同步失败')
              }
              
              // 发送获取任务指令
              Taro.eventCenter.trigger('deviceConnected')
              console.log('已触发设备连接事件，准备获取任务列表')
              
              // 立即返回上一页，在 connection 页面获取任务
              Taro.navigateBack()
            }).catch((error) => {
              console.error('时间同步出错:', error)
              
              // 即使出错，也获取任务
              Taro.eventCenter.trigger('deviceConnected')
              console.log('已触发设备连接事件，准备获取任务列表')
              
              // 立即返回上一页
              Taro.navigateBack()
            })
          }, 1000)
        })
      },
      fail: (err) => {
        console.error('连接设备失败:', err)
        
        setTimeout(() => {
          Taro.createBLEConnection({
            deviceId: device.deviceId,
            success: (res) => {
              console.log('重连设备成功:', res)
              
              const connectedDevice: Device = {
                ...device,
                status: 'connected'
              }
              
              saveConnectedDevice(connectedDevice)
              
              getDeviceServicesAndCharacteristics(device, () => {
                setTimeout(() => {
                  sendCurrentTimeToDevice().then((success) => {
                    if (success) {
                      console.log('重连后时间同步成功')
                    }
                    
                    // 触发获取任务事件
                    Taro.eventCenter.trigger('deviceConnected')
                    console.log('重连后已触发设备连接事件，准备获取任务列表')
                    
                    Taro.navigateBack()
                  }).catch((error) => {
                    console.error('重连后时间同步出错:', error)
                    
                    // 即使出错，也获取任务
                    Taro.eventCenter.trigger('deviceConnected')
                    console.log('重连后已触发设备连接事件，准备获取任务列表')
                    
                    Taro.navigateBack()
                  })
                }, 1000)
              })
            },
            fail: () => {
              console.error('重连设备也失败:')
              Taro.showToast({
                title: '连接失败',
                icon: 'none',
                duration: 2000
              })
            }
          })
        }, 1000)
      },
      complete: () => {
        setShowLoading(false)
      }
    })
  }

  // 搜索设备
  const handleSearchDevice = () => {
    setShowLoading(true)
    setAvailableDevices([])
    
    Taro.getSetting({
      success: (res) => {
        console.log('权限 --- ', res)
        if (!res.authSetting['scope.bluetooth']) {
          Taro.authorize({
            scope: 'scope.bluetooth',
            success: () => {
              initBluetooth(() => {
                startDeviceDiscovery()
              })
            },
            fail: () => {
              console.log('用户拒绝授权')
              setShowLoading(false)
            }
          })
        } else {
          initBluetooth(() => {
            startDeviceDiscovery()
          })
        }
      },
      fail: (err) => {
        console.error('获取权限设置失败:', err)
        setShowLoading(false)
      }
    })
    
    const startDeviceDiscovery = () => {
      Taro.onBluetoothDeviceFound((res) => {
        console.log('发现新设备:', res)
        
        if (res.devices && res.devices.length > 0) {
          res.devices.forEach(device => {
            // 过滤出以 QW-Player 开头的设备
            const deviceName = device.name || '';
            if (device.deviceId && device.connectable !== false && deviceName.startsWith('QW-Player')) {
              const newDevice: Device = {
                name: deviceName,
                status: 'disconnected',
                RSSI: device.RSSI || 0,
                advertisData: device.advertisData || new ArrayBuffer(0),
                advertisServiceUUIDs: device.advertisServiceUUIDs || [],
                deviceId: device.deviceId,
                localName: device.localName || '',
                serviceData: device.serviceData || {},
                connectable: device.connectable !== undefined ? device.connectable : true
              }
              
              const deviceExists = availableDevices.some(d => d.deviceId === newDevice.deviceId)
              if (!deviceExists) {
                setAvailableDevices(prev => [...prev, newDevice])
              }
            }
          })
        }
      })
      
      Taro.startBluetoothDevicesDiscovery({
        success: (res) => {
          console.log('启动蓝牙设备搜索成功:', res)
          setTimeout(() => {
            stopDeviceDiscovery()
          }, 3000)
        },
        fail: (err) => {
          console.error('启动蓝牙设备搜索失败:', err)
          setShowLoading(false)
        }
      })
    }
    
    const stopDeviceDiscovery = () => {
      Taro.stopBluetoothDevicesDiscovery({
        success: () => {
          console.log('停止蓝牙设备搜索成功')
          Taro.offBluetoothDeviceFound()
          setShowLoading(false)
        },
        fail: (err) => {
          console.error('停止蓝牙设备搜索失败:', err)
          Taro.offBluetoothDeviceFound()
          setShowLoading(false)
        }
      })
    }
  }



  return (
    <View className="device-list-page">
      {/* 搜索按钮区域 */}
      <View className="search-section">
        <Button className="search-btn" onClick={handleSearchDevice}>
          搜索
        </Button>
      </View>

      {/* 可连接设备列表 */}
      {availableDevices.length > 0 && (
        <View className="devices-section">
          <View className="section-title">可连接设备</View>
          <View className="devices-list">
            {availableDevices.map((device) => (
              <View className="device-item" key={device.deviceId}>
                <View className="device-info">
                  <Text className="device-name">{device.name || device.localName || '未知设备'}</Text>
                  <View className="signal-info">
                    <Text className="signal-label">信号强度</Text>
                    <View className="signal-bars">
                      {[1, 2, 3, 4].map((bar) => {
                        const level = device.RSSI >= -50 ? 4 : 
                                     device.RSSI >= -60 ? 3 : 
                                     device.RSSI >= -70 ? 2 : 
                                     device.RSSI >= -80 ? 1 : 0
                        return (
                          <View 
                            key={bar} 
                            className={`signal-bar ${bar <= level ? 'active' : ''}`}
                            style={{ height: `${4 + bar * 2}px` }}
                          />
                        )
                      })}
                    </View>
                  </View>
                </View>
                {device.connectable !== false && (
                  <Button 
                    className="connect-btn" 
                    size="mini"
                    onClick={() => connectToDevice(device)}
                  >
                    连接
                  </Button>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <Loading visible={showLoading} text="搜索中..." />
    </View>
  )
}

export default DeviceListPage
