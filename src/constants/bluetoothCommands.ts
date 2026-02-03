// 蓝牙指令常量定义
// 格式: 7E [整体长度] [方向标识] [命令码] [数据]

// 控制类指令
export const CONTROL_COMMANDS = {
  // 恢复出厂设置
  FACTORY_RESET: '7E 03 01 02 01',
  
  // 开关机
  POWER_ON: '7E 04 01 02 02 01',
  POWER_OFF: '7E 04 01 02 02 00',
  
  // 灯模式 (1-3)
  LIGHT_MODE_1: '7E 04 01 02 03 01',
  LIGHT_MODE_2: '7E 04 01 02 03 02',
  LIGHT_MODE_3: '7E 04 01 02 03 03',
  
  // 定时开关
  SCHEDULE_ENABLE: '7E 04 01 02 04 01',
  SCHEDULE_DISABLE: '7E 04 01 02 04 00',
  
  // 上电播放
  POWER_PLAY_ENABLE: '7E 04 01 02 05 01',
  POWER_PLAY_DISABLE: '7E 04 01 02 05 00',
  
  // 到点循环
  TIME_LOOP_ENABLE: '7E 04 01 02 06 01',
  TIME_LOOP_DISABLE: '7E 04 01 02 06 00',
  
  // 播放控制
  PREVIOUS: '7E 03 01 02 07',
  PLAY_PAUSE: '7E 03 01 02 08',
  NEXT: '7E 03 01 02 09',
  
  // 音量控制
  VOLUME_UP: '7E 03 01 02 0A',
  VOLUME_DOWN: '7E 03 01 02 0B',
  
  // 设备状态查询
  GET_DEVICE_STATUS: '7E 03 01 02 10'
};

// 文件管理类指令
export const FILE_COMMANDS = {
  // 读取文件列表
  READ_FILE_LIST: '7E 03 01 02 30',
  
  // 删除文件 (需要替换[ID]为实际文件ID)
  DELETE_FILE: (fileId: string) => `7E 04 01 02 32 ${fileId}`,
  
  // 文件传输相关
  START_FILE_TRANSFER: (totalLength: string, fileIdLength: string, fileId: string, fileSize: string[]) => 
    `7E ${totalLength} 01 02 33 ${fileIdLength} ${fileId} ${fileSize.join(' ')}`,
  END_FILE_TRANSFER: '7E 03 01 02 35',
  
  // LED文字显示 (需要计算整体长度)
  SEND_LED_TEXT: (totalLength: string, textLength: string, textData: string) => 
    `7E ${totalLength} 01 02 20 ${textLength} ${textData}`
};

// 任务管理类指令
export const TASK_COMMANDS = {
  // 定时任务
  GET_SCHEDULE_TASKS: '7E 03 01 02 42',
  UPDATE_SCHEDULE_TASK: (totalLength: string, taskData: string) => 
    `7E ${totalLength} 01 02 40 ${taskData}`,
  
  // 循环播放任务
  GET_INTERVAL_TASKS: '7E 03 01 02 51',
  UPDATE_INTERVAL_TASK: (totalLength: string, taskData: string) => 
    `7E ${totalLength} 01 02 50 ${taskData}`
};

// 响应命令码映射
export const RESPONSE_CODES = {
  // 控制类响应
  DEVICE_STATUS: 0x11,
  
  // 文件管理响应
  FILE_LIST_ITEM: 0x31,
  FILE_LIST_END: 0x32,
  DELETE_FILE_RESULT: 0x33,
  FILE_TRANSFER_CONFIRM: 0x36,
  
  // 任务管理响应
  SCHEDULE_TASK_ITEM: 0x42,
  SCHEDULE_TASK_END: 0x43,
  SCHEDULE_TASK_UPDATE_RESULT: 0x41,
  
  INTERVAL_TASK_ITEM: 0x52,
  INTERVAL_TASK_END: 0x53,
  INTERVAL_TASK_UPDATE_RESULT: 0x51
};

// 方向标识
export const DIRECTION = {
  DOWN: '01', // 下行 (我们发给设备)
  UP: '02'    // 上行 (设备发给我们)
};

// 通用结果码
export const RESULT_CODES = {
  SUCCESS: 0x01,
  FAILURE: 0x00
};