import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button } from '@tarojs/components';
import './DeviceItem.scss';

interface DeviceItemProps {
  device: Device;
  onDisconnect: () => void;
  onConnect: () => void;
  onDelete: () => void;
}

const DeviceItem: React.FC<DeviceItemProps> = ({ device, onDisconnect, onConnect, onDelete }) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const handleTouchStart = (e: any) => {
    if (device.status === 'disconnected') {
      setIsSwiping(true);
    }
  };
  
  const handleTouchEnd = (e: any) => {
    if (isSwiping) {
      setIsSwiping(false);
    }
  };
  
  const handleDeleteClick = () => {
    onDelete();
  };
  
  return (
    <View 
      className={`device-item ${isSwiping ? 'swipe-left' : ''}`} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <View className="device-info">
        <View className="bluetooth-icon">B</View>
        <View className="device-details">
          <Text className="device-name">{device.name}</Text>
          <Text className="device-status">{device.status === 'connected' ? '已连接' : '未连接'}</Text>
        </View>
      </View>
      {device.status === 'connected' ? (
        <Button className="action-btn disconnect-btn" onClick={onDisconnect}>
          断开
        </Button>
      ) : (
        <Button className="action-btn connect-btn" onClick={onConnect}>
          连接
        </Button>
      )}
      {/* {device.status === 'disconnected' && (
        <View className="delete-area" onClick={handleDeleteClick}>
          删除
        </View>
      )} */}
    </View>
  );
};

export default DeviceItem;