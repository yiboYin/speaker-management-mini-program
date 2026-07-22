import React, { useState } from 'react'
import { View, Text, Button, Textarea, ScrollView } from '@tarojs/components'
import Taro, { cloud } from '@tarojs/taro'
import './index.scss'

// 音色选项（阿里云百炼 CosyVoice v3 Flash 支持的音色）
const VOICE_OPTIONS = [
  // 标准音色
  { value: 'longanyang', label: '龙安洋' },
  { value: 'longanhuan', label: '龙安欢' },
  { value: 'longze_v3', label: '龙泽' },
  { value: 'longcheng_v3', label: '龙橙' },
  { value: 'longyan_v3', label: '龙颜' },
  { value: 'longxing_v3', label: '龙星' },
];

// 阿里云百炼配置
const ALIYUN_API_KEY = 'sk-ws-H.REYYDXX.A5kH.MEQCIDPEXdfbnGeixRvf8dJPkkjTqn7qpLSs0adZ_0A-3D8XAiBYvTXTWRdSMZxxjp0tHfyia0rIZMvNW1m37c9NdAa4CQ';
const ALIYUN_TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';

const SynthesisPage: React.FC = () => {
  // 输入框内容状态
  const [inputValue, setInputValue] = useState('')
  
  // 选择的音色（默认选中龙安洋）
  const [selectedVoice, setSelectedVoice] = useState('longanyang')
  
  // 合成状态
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  
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
  
  // 开始合成 - 调用云函数
  const startSynthesis = async () => {
    if (!inputValue.trim()) {
      Taro.showToast({
        title: '请输入要合成的内容',
        icon: 'none'
      });
      return;
    }
    
    // 检查文本长度（阿里云限制单次最多300字符）
    if (inputValue.length > 300) {
      Taro.showToast({
        title: '文本过长，请控制在300字符以内',
        icon: 'none'
      });
      return;
    }
    
    setIsSynthesizing(true);
    Taro.showLoading({ title: '正在合成...' });
    
    try {
      console.log('开始调用云函数...');
      console.log('文本:', inputValue);
      console.log('音色:', selectedVoice);
      
      // 直接调用阿里云API
      const response = await Taro.request({
        url: ALIYUN_TTS_URL,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${ALIYUN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'cosyvoice-v3-flash',
          input: {
            text: inputValue,
            voice: selectedVoice,
            format: 'mp3',
            sample_rate: 24000
          }
        }
      });
      
      console.log('API响应:', response);
      
      if (response.statusCode === 200 && response.data) {
        const result = response.data as any;
        
        // 检查是否有音频URL
        if (result.output && result.output.audio && result.output.audio.url) {
          let audioUrl = result.output.audio.url;
          
          console.log('原始音频URL:', audioUrl);
          
          // 【关键】将 http:// 替换为 https://
          if (audioUrl.startsWith('http://')) {
            audioUrl = audioUrl.replace('http://', 'https://');
            console.log('转换后的音频URL:', audioUrl);
          }
          
          // 添加到历史记录
          setHistory(prev => [
            inputValue,
            ...prev.filter(item => item !== inputValue)
          ]);
          
          Taro.hideLoading();
          Taro.showLoading({ title: '正在下载...' });
          
          try {
            // 下载音频文件（使用 https URL）
            const downloadRes = await Taro.downloadFile({
              url: audioUrl
            });
          
          console.log('下载成功:', downloadRes);
          
          if (downloadRes.statusCode === 200) {
            const tempFilePath = downloadRes.tempFilePath;
            
            // 生成文件名（4位随机数字）
            const fileName = `${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}.mp3`;
            
            Taro.hideLoading();
            Taro.showToast({
              title: '合成成功',
              icon: 'success'
            });
            
            // 清空输入框
            setInputValue('');
            
            // 延迟一下再跳转，让用户看到成功提示
            setTimeout(() => {
              // 通过全局事件总线传递数据
              Taro.eventCenter.trigger('synthesisComplete', {
                filePath: tempFilePath,
                fileName: fileName,
                duration: 0, // 暂时设为0，后续可以获取真实时长
                text: inputValue
              });
              
              // 返回导入页面
              Taro.navigateBack({
                delta: 1
              });
            }, 500);
          } else {
            throw new Error(`下载失败: ${downloadRes.statusCode}`);
          }
          } catch (downloadError) {
            Taro.hideLoading();
            console.error('下载音频失败:', downloadError);
            Taro.showToast({
              title: '下载音频失败',
              icon: 'none'
            });
          }
        } else {
          // 输出详细错误信息
          console.error('HTTP状态码:', response.statusCode);
          console.error('响应数据:', response.data);
          throw new Error(`请求失败: ${response.statusCode}`);
        }
      } else {
        throw new Error(`请求失败: ${response.statusCode}`);
      }
    } catch (error) {
      Taro.hideLoading();
      
      let errorMessage = '合成失败';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        
        // 检查是否是阿里云账户欠费错误
        if (err.data && err.data.code === 'Arrearage') {
          errorMessage = '阿里云账户欠费，请充值后重试';
          Taro.showModal({
            title: '账户异常',
            content: '检测到阿里云账户欠费或余额不足，请访问阿里云官网充值后再试。\n\n详情查看：https://help.aliyun.com/zh/model-studio/error-code#overdue-payment',
            showCancel: false,
            confirmText: '知道了'
          });
        } else {
          errorMessage = err.errMsg || err.message || '未知错误';
        }
      }
      
      Taro.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
      console.error('语音合成失败:', error);
    } finally {
      setIsSynthesizing(false);
    }
  }
  
  // 播放音频
  const playAudio = (audioPath: string) => {
    const audioInstance = Taro.createInnerAudioContext();
    audioInstance.src = audioPath;
    audioInstance.play();
    
    audioInstance.onPlay(() => {
      console.log('音频开始播放');
      Taro.showToast({
        title: '正在播放...',
        icon: 'none'
      });
    });
    
    audioInstance.onError((res) => {
      console.error('音频播放失败:', res.errMsg);
      Taro.showToast({
        title: '播放失败',
        icon: 'none'
      });
    });
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
          placeholder="请输入要合成的内容（最多300字符）"
          maxlength={300}
          autoHeight
        />
        <Text className="char-count">{inputValue.length}/300</Text>
      </View>
      
      {/* 音色选择 */}
      <View className="voice-selector">
        <Text className="selector-label">选择音色：</Text>
        <ScrollView className="voice-options" scrollX={true}>
          {VOICE_OPTIONS.map((voice) => (
            <View 
              key={voice.value}
              className={`voice-option ${selectedVoice === voice.value ? 'active' : ''}`}
              onClick={() => setSelectedVoice(voice.value)}
            >
              <Text>{voice.label}</Text>
            </View>
          ))}
        </ScrollView>
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
        <Button 
          className="start-synthesis-btn" 
          onClick={startSynthesis}
          disabled={isSynthesizing}
        >
          {isSynthesizing ? '合成中...' : '开始合成'}
        </Button>
      </View>
    </View>
  )
}

export default SynthesisPage