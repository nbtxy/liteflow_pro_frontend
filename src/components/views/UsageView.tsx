'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { apiFetch } from '@/lib/api';

interface UsageData {
  period: { from: string; to: string };
  total: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    apiCalls: number;
    estimatedCost: string;
  };
  byProvider: Record<string, {
    inputTokens: number;
    outputTokens: number;
    apiCalls: number;
    estimatedCost: string;
  }>;
  daily: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
  }>;
}

export function UsageView() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      setLoading(true);
      try {
        const data = await apiFetch<UsageData>(`/api/user/usage?period=${timeRange}`);
        setUsageData(data);
      } catch (error) {
        console.error('Failed to fetch usage data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, [timeRange]);

  // 生成连续的日期数组
  const generateDateRange = (days: number) => {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push({
        fullDate: `${year}-${month}-${day}`, // 匹配后端的 "YYYY-MM-DD"
        shortDate: `${month}/${day}`
      });
    }
    return dates;
  };

  // 整理每日趋势数据，补全没有数据的日期
  const getDailyTrend = () => {
    if (!usageData) return [];
    const days = timeRange === 'week' ? 7 : 30;
    const dateRange = generateDateRange(days);
    
    const dailyMap = new Map(usageData.daily.map(d => [d.date, d.inputTokens + d.outputTokens]));
    
    return dateRange.map(d => ({
      date: d.shortDate,
      tokens: dailyMap.get(d.fullDate) || 0
    }));
  };

  // 整理模型占比数据
  const getModelBreakdown = () => {
    if (!usageData) return [];
    const total = usageData.total.totalTokens;
    if (total === 0) return [];
    
    return Object.entries(usageData.byProvider)
      .map(([model, stats]) => {
        const tokens = stats.inputTokens + stats.outputTokens;
        return {
          model,
          tokens,
          percentage: Math.round((tokens / total) * 100)
        };
      })
      .sort((a, b) => b.tokens - a.tokens);
  };

  const dailyTrend = getDailyTrend();
  const maxDailyTokens = dailyTrend.length > 0 ? Math.max(...dailyTrend.map(d => d.tokens)) : 0;
  const modelBreakdown = getModelBreakdown();

  // 暂定硬编码一个额度，或者如果后端不提供，就显示为无限制
  const limit = 2000000;
  const totalTokens = usageData?.total.totalTokens || 0;
  const usagePercentage = Math.min((totalTokens / limit) * 100, 100).toFixed(2);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Token 用量统计</h1>
            <p className="text-sm text-gray-500 mt-1">查看您的 API 调用情况和 Token 消耗</p>
          </div>
          
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            <button 
              onClick={() => setTimeRange('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === 'week' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              本周
            </button>
            <button 
              onClick={() => setTimeRange('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === 'month' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              本月
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">总 Token 消耗</h3>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{totalTokens.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 ml-2">/ {limit.toLocaleString()}</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>额度使用率</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">总请求次数</h3>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{usageData?.total.apiCalls.toLocaleString() || 0}</span>
                  <span className="text-sm text-gray-500 ml-2">次</span>
                </div>
                <p className="text-sm text-gray-400 mt-4 flex items-center">
                  在所选时间范围内
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-80">
                <h3 className="text-base font-semibold text-gray-900 mb-6 shrink-0">每日用量趋势</h3>
                {dailyTrend.length > 0 && maxDailyTokens > 0 ? (
                  <div className="flex-1 flex items-end justify-between gap-[2px] sm:gap-1 pb-2 relative">
                    {/* Y-axis placeholder lines (optional visual enhancement) */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 z-0">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="border-b border-gray-100 w-full h-0"></div>
                      ))}
                    </div>
                    
                    {dailyTrend.map((day, idx) => {
                      const heightPercentage = maxDailyTokens > 0 ? (day.tokens / maxDailyTokens) * 100 : 0;
                      const minHeight = day.tokens > 0 ? '4px' : '0px';
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 group h-full justify-end z-10">
                          <div className="relative w-full flex justify-center h-full items-end pb-8">
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-20">
                              {day.date}: {day.tokens.toLocaleString()}
                            </div>
                            <div 
                              className={`w-full max-w-[24px] rounded-t-sm transition-all duration-300 ${day.tokens > 0 ? 'bg-teal-100 group-hover:bg-teal-500' : 'bg-transparent'}`}
                              style={{ height: `${heightPercentage}%`, minHeight }}
                            ></div>
                          </div>
                          
                          {/* Date Labels - Absolute positioned at bottom */}
                          <div className="absolute bottom-0 w-full flex justify-center">
                            {timeRange === 'month' ? (
                              (idx % 5 === 0 || idx === dailyTrend.length - 1) ? (
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">{day.date}</span>
                              ) : null
                            ) : (
                              <span className="text-xs text-gray-500 whitespace-nowrap">{day.date}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                    暂无用量数据
                  </div>
                )}
              </div>

              {/* Breakdown List */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-80">
                <h3 className="text-base font-semibold text-gray-900 mb-6 shrink-0">模型用量分布</h3>
                <div className="flex-1 overflow-y-auto pr-2">
                  {modelBreakdown.length > 0 ? (
                    <div className="space-y-5">
                      {modelBreakdown.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.model}</span>
                            <span className="text-sm text-gray-900 font-medium">{item.tokens.toLocaleString()} <span className="text-gray-500 font-normal text-xs">Tokens</span></span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div 
                                className="bg-teal-500 h-1.5 rounded-full" 
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      暂无模型分布数据
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Info Box */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex items-start gap-3 mt-4">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium mb-1">提示</p>
            <p className="text-blue-700/80">实际的 Token 消耗可能因为模型的不同和计费规则的变化而有所差异，计费数据通常会有 5-10 分钟的延迟。</p>
          </div>
        </div>

      </div>
    </div>
  );
}
