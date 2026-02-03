# 蓝牙指令使用指南

## 概述
本文档介绍了蓝牙指令常量系统的使用方法。所有蓝牙指令现在都集中管理在 `src/constants/bluetoothCommands.ts` 文件中。

## 导入方式
```typescript
import { 
  CONTROL_COMMANDS, 
  FILE_COMMANDS, 
  TASK_COMMANDS, 
  RESPONSE_CODES, 
  RESULT_CODES,
  DIRECTION 
} from '@/constants/bluetoothCommands';
```

## 指令分类

### 1. 控制类指令 (CONTROL_COMMANDS)
```typescript
// 设备控制
CONTROL_COMMANDS.FACTORY_RESET     // 恢复出厂设置
CONTROL_COMMANDS.POWER_ON          // 开机
CONTROL_COMMANDS.POWER_OFF         // 关机

// 灯光控制
CONTROL_COMMANDS.LIGHT_MODE_1      // 灯模式1
CONTROL_COMMANDS.LIGHT_MODE_2      // 灯模式2
CONTROL_COMMANDS.LIGHT_MODE_3      // 灯模式3

// 功能开关
CONTROL_COMMANDS.SCHEDULE_ENABLE   // 定时开启
CONTROL_COMMANDS.SCHEDULE_DISABLE  // 定时关闭
CONTROL_COMMANDS.POWER_PLAY_ENABLE // 上电播放开启
CONTROL_COMMANDS.POWER_PLAY_DISABLE // 上电播放关闭
CONTROL_COMMANDS.TIME_LOOP_ENABLE  // 到点循环开启
CONTROL_COMMANDS.TIME_LOOP_DISABLE // 到点循环关闭

// 播放控制
CONTROL_COMMANDS.PREVIOUS          // 上一首
CONTROL_COMMANDS.PLAY_PAUSE        // 播放/暂停
CONTROL_COMMANDS.NEXT              // 下一首

// 音量控制
CONTROL_COMMANDS.VOLUME_UP         // 音量加
CONTROL_COMMANDS.VOLUME_DOWN       // 音量减

// 状态查询
CONTROL_COMMANDS.GET_DEVICE_STATUS // 获取设备状态
```

### 2. 文件管理类指令 (FILE_COMMANDS)
```typescript
// 文件操作
FILE_COMMANDS.READ_FILE_LIST       // 读取文件列表
FILE_COMMANDS.DELETE_FILE(fileId)  // 删除文件 (传入文件ID)

// 文件传输
FILE_COMMANDS.START_FILE_TRANSFER(totalLength, fileIdLength, fileId, fileSize)
                                   // 开始文件传输
FILE_COMMANDS.END_FILE_TRANSFER    // 结束文件传输

// LED显示
FILE_COMMANDS.SEND_LED_TEXT(totalLength, textLength, textData)
                                   // 发送LED文字
```

### 3. 任务管理类指令 (TASK_COMMANDS)
```typescript
// 定时任务
TASK_COMMANDS.GET_SCHEDULE_TASKS   // 获取定时任务列表
TASK_COMMANDS.UPDATE_SCHEDULE_TASK(totalLength, taskData)
                                   // 更新定时任务

// 循环任务
TASK_COMMANDS.GET_INTERVAL_TASKS   // 获取循环任务列表
TASK_COMMANDS.UPDATE_INTERVAL_TASK(totalLength, taskData)
                                   // 更新循环任务
```

## 响应码常量 (RESPONSE_CODES)
```typescript
// 设备状态
RESPONSE_CODES.DEVICE_STATUS       // 0x11

// 文件管理响应
RESPONSE_CODES.FILE_LIST_ITEM      // 0x31
RESPONSE_CODES.FILE_LIST_END       // 0x32
RESPONSE_CODES.DELETE_FILE_RESULT  // 0x33
RESPONSE_CODES.FILE_TRANSFER_CONFIRM // 0x36

// 任务管理响应
RESPONSE_CODES.SCHEDULE_TASK_ITEM  // 0x42
RESPONSE_CODES.SCHEDULE_TASK_END   // 0x43
RESPONSE_CODES.SCHEDULE_TASK_UPDATE_RESULT // 0x41

RESPONSE_CODES.INTERVAL_TASK_ITEM  // 0x52
RESPONSE_CODES.INTERVAL_TASK_END   // 0x53
RESPONSE_CODES.INTERVAL_TASK_UPDATE_RESULT // 0x51
```

## 结果码常量 (RESULT_CODES)
```typescript
RESULT_CODES.SUCCESS               // 0x01 (成功)
RESULT_CODES.FAILURE               // 0x00 (失败)
```

## 方向标识 (DIRECTION)
```typescript
DIRECTION.DOWN                     // '01' (下行 - 我们发给设备)
DIRECTION.UP                       // '02' (上行 - 设备发给我们)
```

## 使用示例

### 1. 发送简单控制指令
```typescript
import { sendCommandToDevice } from '@/utils/deviceUtils';
import { CONTROL_COMMANDS, RESPONSE_CODES, RESULT_CODES } from '@/constants/bluetoothCommands';

// 发送开机指令
await sendCommandToDevice(CONTROL_COMMANDS.POWER_ON, (data) => {
  console.log('开机响应:', data);
});
```

### 2. 发送带参数的指令
```typescript
// 删除指定文件
const fileId = '01';
const command = FILE_COMMANDS.DELETE_FILE(fileId);
await sendCommandToDevice(command, (data) => {
  if (data.resValue && data.resValue.length >= 4) {
    const responseCmd = data.resValue[1];
    const result = data.resValue[3];
    
    if (responseCmd === RESPONSE_CODES.DELETE_FILE_RESULT && 
        result === RESULT_CODES.SUCCESS) {
      console.log('文件删除成功');
    }
  }
});
```

### 3. 发送复杂数据指令
```typescript
// 发送LED文字
const text = 'Hello World';
const encoder = new TextEncoder();
const textBytes = encoder.encode(text);
const textLength = textBytes.length.toString(16).padStart(2, '0');
const textHex = Array.from(textBytes)
  .map(b => b.toString(16).padStart(2, '0'))
  .join(' ');

const totalLength = (2 + 1 + 1 + textBytes.length).toString(16).padStart(2, '0');

const command = FILE_COMMANDS.SEND_LED_TEXT(totalLength, textLength, textHex);
await sendCommandToDevice(command, (data) => {
  console.log('LED发送响应:', data);
});
```

### 4. 解析设备响应
```typescript
// 获取设备状态
await sendCommandToDevice(CONTROL_COMMANDS.GET_DEVICE_STATUS, (data) => {
  if (data.resValue && data.resValue.length >= 6) {
    const responseCmd = data.resValue[1]; // 应答命令码
    
    if (responseCmd === RESPONSE_CODES.DEVICE_STATUS) {
      const powerStatus = data.resValue[2];    // 开关机状态
      const scheduleStatus = data.resValue[3]; // 定时状态
      const powerPlayStatus = data.resValue[4]; // 上电播放状态
      const timeLoopStatus = data.resValue[5];  // 到点循环状态
      
      console.log('设备状态:', {
        power: powerStatus === 0x01 ? '开机' : '关机',
        schedule: scheduleStatus === 0x01 ? '开启' : '关闭',
        powerPlay: powerPlayStatus === 0x01 ? '开启' : '关闭',
        timeLoop: timeLoopStatus === 0x01 ? '开启' : '关闭'
      });
    }
  }
});
```

## 优势

1. **统一管理**: 所有指令集中在一个文件中，便于维护
2. **类型安全**: 使用TypeScript常量，减少拼写错误
3. **易于扩展**: 添加新指令只需在常量文件中定义
4. **代码复用**: 多个页面可以共享相同的指令定义
5. **文档友好**: 常量名称具有自解释性

## 注意事项

1. 参数化的指令函数需要传入正确的参数
2. 响应处理时要检查命令码和结果码
3. 文件传输等复杂操作需要按顺序发送多个指令
4. 保持指令格式与设备协议一致