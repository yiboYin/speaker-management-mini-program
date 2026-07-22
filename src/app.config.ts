export default defineAppConfig({
  pages: [
    'pages/connection/index',
    'pages/connection/device-list/index',
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
        text: '设备',
        iconPath: 'assets/images/connection.png',
        selectedIconPath: 'assets/images/connection-selected.png'
      },
      {
        pagePath: 'pages/import/index',
        text: '音频',
        iconPath: 'assets/images/import.png',
        selectedIconPath: 'assets/images/import-selected.png'
      }
    ]
  }
})
