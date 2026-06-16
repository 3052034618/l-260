import { useState } from 'react'
import { AppProvider } from './contexts/AppContext'
import AssetImport from './components/AssetImport'
import ParamsSetting from './components/ParamsSetting'
import CalculationResult from './components/CalculationResult'
import PlanComparisonView from './components/PlanComparisonView'

type TabType = 'import' | 'params' | 'result' | 'comparison'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('import')

  const tabs = [
    { id: 'import' as TabType, label: '资产导入', icon: '📋' },
    { id: 'params' as TabType, label: '参数设置', icon: '⚙️' },
    { id: 'result' as TabType, label: '测算结果', icon: '📊' },
    { id: 'comparison' as TabType, label: '方案对比', icon: '📈' }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">企业资产折旧测算工具</h1>
                <p className="text-xs text-gray-500">本地试算 · 不影响正式账务数据</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm text-gray-500">预算编制辅助工具</p>
                <p className="text-xs text-gray-400">快速比较不同购置方案的年度影响</p>
              </div>
            </div>
          </div>
          
          <nav className="flex border-t border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {activeTab === 'import' && <AssetImport />}
        {activeTab === 'params' && <ParamsSetting />}
        {activeTab === 'result' && <CalculationResult />}
        {activeTab === 'comparison' && <PlanComparisonView />}
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 px-6 mt-auto">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>© 2024 企业资产折旧测算工具 · 本地运行，数据安全</span>
          <span>所有数据保存在本地浏览器存储中</span>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
