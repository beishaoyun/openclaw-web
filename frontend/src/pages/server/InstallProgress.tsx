import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { openclawService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface TaskStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export default function InstallProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [steps, setSteps] = useState<TaskStep[]>([
    { id: '1', name: '环境检测', status: 'pending' },
    { id: '2', name: '依赖安装', status: 'pending' },
    { id: '3', name: '下载 OpenClaw', status: 'pending' },
    { id: '4', name: '部署与初始化', status: 'pending' },
    { id: '5', name: '服务启动', status: 'pending' },
    { id: '6', name: '状态校验', status: 'pending' },
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    // 模拟安装任务开始
    startInstall();

    // 轮询任务状态
    const interval = setInterval(() => {
      if (isPolling) {
        loadTaskStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  const startInstall = async () => {
    try {
      const { data } = await openclawService.install(id!);
      setTask(data);
      setSteps(prev => prev.map((step, i) => ({
        ...step,
        status: i === 0 ? 'running' : 'pending',
      })));
      addLog('开始安装 OpenClaw...');
    } catch (err: any) {
      addLog('启动安装失败：' + (err.response?.data?.message || '未知错误'));
      setIsPolling(false);
    }
  };

  const loadTaskStatus = async () => {
    if (!task?.id) return;
    try {
      const { data } = await openclawService.getTask(task.id);

      // 模拟进度更新
      const completedCount = steps.filter(s => s.status === 'completed').length;
      const runningIndex = steps.findIndex(s => s.status === 'running');

      if (data.status === 'completed') {
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setIsPolling(false);
        addLog('安装完成！');
      } else if (data.status === 'failed') {
        setSteps(prev => {
          const newSteps = [...prev];
          if (runningIndex >= 0) newSteps[runningIndex].status = 'error';
          return newSteps;
        });
        setIsPolling(false);
        addLog('安装失败：' + (data.error || '未知错误'));
      } else {
        // 模拟进度推进
        if (runningIndex >= 0 && completedCount < steps.length) {
          setSteps(prev => {
            const newSteps = [...prev];
            // 随机完成当前步骤并进入下一步
            if (Math.random() > 0.7) {
              newSteps[runningIndex].status = 'completed';
              if (runningIndex + 1 < steps.length) {
                newSteps[runningIndex + 1].status = 'running';
              }
            }
            return newSteps;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load task status:', err);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleCancel = async () => {
    if (!task?.id || !confirm('确定要取消安装吗？')) return;
    try {
      await openclawService.cancelTask(task.id);
      setIsPolling(false);
      addLog('安装已取消');
    } catch (err: any) {
      addLog('取消失败：' + (err.response?.data?.message || '未知错误'));
    }
  };

  const progress = steps.filter(s => s.status === 'completed').length;
  const total = steps.length;
  const percentage = Math.round((progress / total) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OpenClaw 安装进度</h1>
          <p className="text-sm text-zinc-500 mt-1">服务器 ID: {id}</p>
        </div>
        <div className="flex gap-2">
          {isPolling && (
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              取消
            </Button>
          )}
          {!isPolling && steps.every(s => s.status === 'completed') && (
            <Button onClick={() => navigate(`/openclaw/${id}`)} className="gap-2">
              查看详情
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Progress */}
        <Card className="md:col-span-2">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700">总体进度</span>
              <span className="text-sm text-zinc-500">{percentage}% ({progress}/{total} 步骤完成)</span>
            </div>
            <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  step.status === 'running' ? 'bg-blue-50' :
                  step.status === 'completed' ? 'bg-green-50' :
                  step.status === 'error' ? 'bg-red-50' :
                  'bg-zinc-50'
                }`}
              >
                <span className={`text-lg ${getStatusColor(step.status)}`}>
                  {getStatusIcon(step.status)}
                </span>
                <div className="flex-1">
                  <p className={`font-medium ${getStatusColor(step.status)}`}>
                    步骤 {index + 1}: {step.name}
                  </p>
                  {step.message && (
                    <p className="text-sm text-zinc-500 mt-0.5">{step.message}</p>
                  )}
                </div>
                {step.status === 'running' && (
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Logs */}
        <Card title="安装日志">
          <div className="h-64 overflow-y-auto font-mono text-xs bg-zinc-900 text-zinc-100 rounded-lg p-3">
            {logs.length === 0 ? (
              <p className="text-zinc-500">等待日志...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
