export default defineAppConfig({
  pages: [
    'pages/queue/index',
    'pages/passnumber/index',
    'pages/approval/index',
    'pages/business/index',
    'pages/queue-confirm/index',
    'pages/business-detail/index',
    'pages/approval-config/index',
    'pages/approval-visual/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E6FFF',
    navigationBarTitleText: '政务大厅取号系统',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F0F5FF'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#1E6FFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/queue/index',
        text: '取号大厅'
      },
      {
        pagePath: 'pages/passnumber/index',
        text: '过号管理'
      },
      {
        pagePath: 'pages/approval/index',
        text: '审批中心'
      },
      {
        pagePath: 'pages/business/index',
        text: '办理进度'
      }
    ]
  }
})
