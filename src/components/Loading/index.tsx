import React from 'react';
import { View, Text } from '@tarojs/components';
import './Loading.scss';

interface LoadingProps {
  visible: boolean;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ visible, text = '加载中...' }) => {
  if (!visible) {
    return null;
  }

  return (
    <View className="loading-overlay">
      <View className="loading-container">
        <View className="loading-icon"></View>
        <Text className="loading-text">{text}</Text>
      </View>
    </View>
  );
};

export default Loading;