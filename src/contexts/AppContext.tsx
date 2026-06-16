import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Asset, DepreciationParams, Plan, AssetDepreciationResult, BudgetSummary } from '../types'
import {
  calculateAllAssetsDepreciation,
  calculateBudgetSummary,
  generateId,
  formatDate
} from '../utils/depreciation'
import {
  loadAssets,
  saveAssets,
  loadParams,
  saveParams,
  loadPlans,
  savePlans,
  createPlanFromAssets
} from '../utils/storage'

interface AppContextType {
  assets: Asset[]
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Partial<Asset>) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  batchUpdateAssets: (updates: Partial<Asset>) => void
  clearAssets: () => void
  
  params: DepreciationParams
  setParams: (params: DepreciationParams) => void
  updateParams: (updates: Partial<DepreciationParams>) => void
  
  plans: Plan[]
  setPlans: (plans: Plan[]) => void
  saveCurrentAsPlan: (name: string, description: string) => Plan
  deletePlan: (id: string) => void
  loadPlan: (id: string) => void
  
  results: AssetDepreciationResult[]
  budgetSummary: BudgetSummary | null
  calculateResults: () => void
  
  loading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssetsState] = useState<Asset[]>([])
  const [params, setParamsState] = useState<DepreciationParams>({
    method: 'straight-line',
    defaultUsefulLife: 5,
    defaultSalvageRate: 0.05,
    budgetStartDate: formatDate(new Date()),
    budgetYears: 5,
    nearEndMonths: 6
  })
  const [plans, setPlansState] = useState<Plan[]>([])
  const [results, setResults] = useState<AssetDepreciationResult[]>([])
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const savedAssets = loadAssets()
    const savedParams = loadParams()
    const savedPlans = loadPlans()
    
    if (savedAssets.length > 0) setAssetsState(savedAssets)
    if (savedParams) setParamsState(savedParams)
    if (savedPlans.length > 0) setPlansState(savedPlans)
    
    setLoading(false)
  }, [])
  
  useEffect(() => {
    if (!loading) {
      saveAssets(assets)
    }
  }, [assets, loading])
  
  useEffect(() => {
    if (!loading) {
      saveParams(params)
    }
  }, [params, loading])
  
  useEffect(() => {
    if (!loading) {
      savePlans(plans)
    }
  }, [plans, loading])
  
  const setAssets = useCallback((newAssets: Asset[]) => {
    setAssetsState(newAssets)
  }, [])
  
  const addAsset = useCallback((partial: Partial<Asset>) => {
    const newAsset: Asset = {
      id: generateId(),
      assetCode: partial.assetCode || '',
      assetName: partial.assetName || '',
      category: partial.category || '电子设备',
      department: partial.department || '其他',
      originalValue: partial.originalValue || 0,
      usefulLife: partial.usefulLife || params.defaultUsefulLife,
      salvageRate: partial.salvageRate ?? params.defaultSalvageRate,
      startDate: partial.startDate || params.budgetStartDate,
      method: partial.method || params.method,
      accumulatedDepreciation: partial.accumulatedDepreciation || 0,
      netValue: (partial.originalValue || 0) - (partial.accumulatedDepreciation || 0),
      remark: partial.remark || ''
    }
    setAssetsState(prev => [...prev, newAsset])
  }, [params])
  
  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssetsState(prev => prev.map(asset => 
      asset.id === id 
        ? { ...asset, ...updates, netValue: (updates.originalValue ?? asset.originalValue) - (updates.accumulatedDepreciation ?? asset.accumulatedDepreciation) }
        : asset
    ))
  }, [])
  
  const deleteAsset = useCallback((id: string) => {
    setAssetsState(prev => prev.filter(asset => asset.id !== id))
  }, [])
  
  const batchUpdateAssets = useCallback((updates: Partial<Asset>) => {
    setAssetsState(prev => prev.map(asset => ({
      ...asset,
      ...updates,
      netValue: (updates.originalValue ?? asset.originalValue) - (updates.accumulatedDepreciation ?? asset.accumulatedDepreciation)
    })))
  }, [])
  
  const clearAssets = useCallback(() => {
    setAssetsState([])
  }, [])
  
  const setParams = useCallback((newParams: DepreciationParams) => {
    setParamsState(newParams)
  }, [])
  
  const updateParams = useCallback((updates: Partial<DepreciationParams>) => {
    setParamsState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const setPlans = useCallback((newPlans: Plan[]) => {
    setPlansState(newPlans)
  }, [])
  
  const saveCurrentAsPlan = useCallback((name: string, description: string) => {
    const newPlan = createPlanFromAssets(name, description, assets, params)
    setPlansState(prev => [...prev, newPlan])
    return newPlan
  }, [assets, params])
  
  const deletePlan = useCallback((id: string) => {
    setPlansState(prev => prev.filter(plan => plan.id !== id))
  }, [])
  
  const loadPlan = useCallback((id: string) => {
    const plan = plans.find(p => p.id === id)
    if (plan) {
      setAssetsState(plan.assets)
      setParamsState(plan.params)
    }
  }, [plans])
  
  const calculateResults = useCallback(() => {
    const newResults = calculateAllAssetsDepreciation(assets, params.nearEndMonths)
    setResults(newResults)
    
    if (newResults.length > 0) {
      const summary = calculateBudgetSummary(newResults, {
        budgetStartDate: params.budgetStartDate,
        budgetYears: params.budgetYears,
        nearEndMonths: params.nearEndMonths
      })
      setBudgetSummary(summary)
    } else {
      setBudgetSummary(null)
    }
  }, [assets, params])
  
  return (
    <AppContext.Provider value={{
      assets,
      setAssets,
      addAsset,
      updateAsset,
      deleteAsset,
      batchUpdateAssets,
      clearAssets,
      params,
      setParams,
      updateParams,
      plans,
      setPlans,
      saveCurrentAsPlan,
      deletePlan,
      loadPlan,
      results,
      budgetSummary,
      calculateResults,
      loading
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
