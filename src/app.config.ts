export default defineAppConfig({
  pages: [
    'pages/connection/index',
    'pages/task/index',
    'pages/import/index',
    'pages/setting/index',
    'pages/task/schedule-edit/index',
    'pages/import/synthesis/index',
    'pages/task/interval-play/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'Speaker Management',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#7A7E83',
    selectedColor: '#00bcd4',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/connection/index',
        text: '连接',
        iconPath: 'assets/images/connection.png',
        selectedIconPath: 'assets/images/connection-selected.png'
      },
      {
        pagePath: 'pages/task/index',
        text: '任务',
        iconPath: 'assets/images/task.png',
        selectedIconPath: 'assets/images/task-selected.png'
      },
      {
        pagePath: 'pages/import/index',
        text: '导入',
        iconPath: 'assets/images/import.png',
        selectedIconPath: 'assets/images/import-selected.png'
      },
      {
        pagePath: 'pages/setting/index',
        text: '设置',
        iconPath: 'assets/images/setting.png',
        selectedIconPath: 'assets/images/setting-selected.png'
      }
    ]
  }
})
