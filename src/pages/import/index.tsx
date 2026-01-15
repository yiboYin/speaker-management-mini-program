import React, { useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { useReachBottom, navigateTo } from '@tarojs/taro'
import './index.scss'

const ImportPage: React.FC = () => {
  useReachBottom(() => {
    console.log('reach import page bottom')
  })

  // 选中文件的状态
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // 模拟文件列表数据
  const fileList = [
    { id: '1', name: '音频文件1.mp3', size: '3.2MB', date: '2023-05-15', duration: '3:25' },
    { id: '2', name: '音频文件2.mp3', size: '4.5MB', date: '2023-05-16', duration: '4:12' },
    { id: '3', name: '音频文件3.mp3', size: '2.1MB', date: '2023-05-17', duration: '2:38' },
    { id: '4', name: '音频文件4.mp3', size: '5.7MB', date: '2023-05-18', duration: '5:45' },
    { id: '5', name: '音频文件5.mp3', size: '3.8MB', date: '2023-05-19', duration: '3:52' },
    { id: '6', name: '音频文件6.mp3', size: '6.2MB', date: '2023-05-20', duration: '6:18' },
    { id: '7', name: '音频文件7.mp3', size: '2.9MB', date: '2023-05-21', duration: '2:55' },
  ];

  return (
    <View className="import-page">
      {/* 工具栏（移除绝对定位） */}
      <View className="toolbar">
        <View className="left-buttons">
          <Button className="toolbar-btn" onClick={() => {
            // 跳转到合成页面
            navigateTo({
              url: '/pages/import/synthesis/index'
            });
          }}>合成</Button>
          <Button className="toolbar-btn">导入</Button>
        </View>
        <View className="right-buttons">
          <Button className="clear-btn">清空</Button>
        </View>
      </View>
      
      {/* 可滚动的文件列表区域 */}
      <ScrollView 
        className="file-list-container"
        scrollY={true}
      >
        {fileList.map(file => (
          <View 
            key={file.id} 
            className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`} 
            onClick={() => setSelectedFileId(file.id)}
          >
            <Text className="file-name">{file.name} ({file.date})</Text>
            <Text className="file-duration">{file.duration}</Text>
            <Button 
              className="delete-btn" 
              onClick={(e) => {
                e.stopPropagation(); // 阻止点击事件冒泡到父元素
                // 删除文件逻辑
                console.log('删除文件:', file.id);
              }}
            >
              ×
            </Button>
          </View>
        ))}
      </ScrollView>
      
      {/* 底部操作按钮容器 - 仅在选中文件时显示 */}
      {selectedFileId && (
        <View className="bottom-action-container">
          <Button 
            className="action-btn send-to-device" 
            onClick={() => console.log('发送到设备', selectedFileId)}
          >
            发送到设备
          </Button>
          <Button 
            className="action-btn preview" 
            onClick={() => console.log('试听', selectedFileId)}
          >
            试听
          </Button>
        </View>
      )}
    </View>
  )
}

export default ImportPage