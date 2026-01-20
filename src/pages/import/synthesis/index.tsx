import React, { useState, useEffect } from 'react'
import { View, Text, Button, Textarea, ScrollView } from '@tarojs/components'
import './index.scss'

const SynthesisPage: React.FC = () => {
  // 输入框内容状态
  const [inputValue, setInputValue] = useState('')
  
  // 调试用 - 输出输入框内容
  // useEffect(() => {
  //   console.log('当前输入框内容:', inputValue);
  // }, [inputValue]);
  
  // 历史记录状态
  const [history, setHistory] = useState<string[]>([
    '你好欢迎光临寒舍',
    '欢迎光临寒舍',
    '你好欢迎使用本',
    '您好，欢迎光临'
  ])
  
  // 清除历史记录
  const clearHistory = () => {
    setHistory([])
  }
  
  // 将历史记录项填入输入框
  const fillInputFromHistory = (text: string) => {
    setInputValue(text)
  }
  
  // 开始合成 - 将输入框内容添加到历史记录
  const startSynthesis = () => {
    if (inputValue.trim()) {
      setHistory(prev => [
        inputValue,
        ...prev.filter(item => item !== inputValue) // 避免重复
      ])
      setInputValue('') // 清空输入框
    }
  }
  
  return (
    <View className="synthesis-page">
      {/* 顶部输入框 */}
      <View className="input-container">
        <Textarea 
          className="input-field" 
          value={inputValue} 
          onInput={(e) => {
            console.log('输入框内容变化:', e.detail.value);
            setInputValue(e.detail.value);
          }} 
          placeholder="请输入要合成的内容"
          autoHeight
        />
      </View>
          
      {/* 历史记录区域 */}
      <View className="history-section">
        <View className="history-header">
          <Text className="history-title">历史记录</Text>
          <Button className="clear-btn" onClick={clearHistory}>清除</Button>
        </View>
            
        <ScrollView 
          className="history-list" 
          scrollY={true}
        >
          {history.map((item, index) => (
            <View 
              key={index} 
              className="history-item" 
              onClick={() => fillInputFromHistory(item)}
            >
              <Text className="history-text">{item}</Text>
              <Text className="arrow">&gt;</Text>
            </View>
          ))}
        </ScrollView>
      </View>
          
      {/* 底部开始合成按钮 */}
      <View className="bottom-button-container">
        <Button className="start-synthesis-btn" onClick={startSynthesis}>开始合成</Button>
      </View>
    </View>
  )
}

export default SynthesisPage