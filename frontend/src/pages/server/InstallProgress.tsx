import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { openclawService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function InstallProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'running' | 'completed' | 'failed' | 'cancelled'>('running');
  const [isPolling, setIsPolling] = useState(true);

  const steps = [
    { id: '1', name: '检查服务器环境' },
    { id: '2', name: '执行 OpenClaw 安装脚本' },
    { id: '3', name: '验证安装' },
    { id: '4', name: '检查服务状态' },
    { id: '5', name: '检查服务日志' },
    { id: '6', name: '安装完成' },
  ];

  useEffect(() => {
    // 开始安装任务
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
      setCurrentStep(1);
      setLogs(['开始安装 OpenClaw...', '正在连接服务器...']);
    } catch (err: any) {
      setLogs(prev => [...prev, `[错误] 启动安装失败：${err.response?.data?.message || '未知错误'}`]);
      setStatus('failed');
      setIsPolling(false);
    }
  };

  const loadTaskStatus = async () => {
    if (!task?.id) return;
    try {
      const { data } = await openclawService.getTask(task.id);

      // 更新状态
      setStatus(data.status);
      setCurrentStep(data.currentStep || 1);

      // 更新日志
      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs);
      }

      // 检查完成状态
      if (data.status === 'completed') {
        setIsPolling(false);
        setLogs(prev => [...prev, '\n✅ 安装完成！']);
      } else if (data.status === 'failed') {
        setIsPolling(false);
        setLogs(prev => [...prev, `\n❌ 安装失败：${data.errorMessage || '未知错误'}`]);
      } else if (data.status === 'cancelled') {
        setIsPolling(false);
        setLogs(prev => [...prev, '\n⚠️ 安装已取消']);
      }
    } catch (err) {
      console.error('Failed to load task status:', err);
    }
  };

  const handleCancel = async () => {
    if (!task?.id || !confirm('确定要取消安装吗？')) return;
    try {
      await openclawService.cancelTask(task.id);
      setIsPolling(false);
      setStatus('cancelled');
      setLogs(prev => [...prev, '⚠️ 安装已取消']);
    } catch (err: any) {
      setLogs(prev => [...prev, `[错误] 取消失败：${err.response?.data?.message || '未知错误'}`]);
    }
  };

  const percentage = Math.round(((currentStep - 1) / steps.length) * 100);

  const getStatusIcon = () => {
    if (status === 'completed') return '✅';
    if (status === 'failed') return '❌';
    if (status === 'cancelled') return '⚠️';
    return '🔄';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OpenClaw 安装进度</h1>
          <p className="text-sm text-zinc-500 mt-1">
            服务器 ID: {id} {status === 'running' && '(安装中...)'}
          </p>
        </div>
        <div className="flex gap-2">
          {isPolling && (
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              取消安装
            </Button>
          )}
          {!isPolling && status === 'completed' && (
            <Button onClick={() => navigate(`/openclaw/${id}`)} className="gap-2">
              管理 OpenClaw
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700">总体进度</span>
            <span className="text-sm text-zinc-500">{percentage}% (步骤 {currentStep}/{steps.length})</span>
          </div>
          <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                status === 'failed' ? 'bg-red-600' :
                status === 'completed' ? 'bg-green-600' :
                'bg-gradient-to-r from-blue-600 to-purple-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCurrent = stepIndex === currentStep;
            const isCompleted = stepIndex < currentStep;
            const isFailed = status === 'failed' && isCurrent;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isFailed ? 'bg-red-50 border-red-200' :
                  isCurrent ? 'bg-blue-50 border-blue-200' :
                  isCompleted ? 'bg-green-50 border-green-200' :
                  'bg-zinc-50 border-zinc-200'
                }`}
              >
                <span className={`text-lg ${
                  isFailed ? 'text-red-600' :
                  isCurrent ? 'text-blue-600' :
                  isCompleted ? 'text-green-600' :
                  'text-zinc-400'
                }`}>
                  {isCompleted ? '✅' : isCurrent ? '🔄' : '⏳'}
                </span>
                <span className={`font-medium ${
                  isFailed ? 'text-red-600' :
                  isCurrent ? 'text-blue-600' :
                  isCompleted ? 'text-green-600' :
                  'text-zinc-700'
                }`}>
                  步骤 {stepIndex}: {step.name}
                </span>
                {isCurrent && status === 'running' && (
                  <svg className="animate-spin h-4 w-4 text-blue-600 ml-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="安装日志 (实时)">
        <div className="h-96 overflow-y-auto font-mono text-xs bg-zinc-900 text-zinc-100 rounded-lg p-4">
          {logs.length === 0 ? (
            <p className="text-zinc-500">等待日志...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="py-0.5 whitespace-pre-wrap">
                {log.startsWith('[错误]') ? (
                  <span className="text-red-400">{log}</span>
                ) : log.startsWith('✅') || log.startsWith('✓') ? (
                  <span className="text-green-400">{log}</span>
                ) : log.startsWith('⚠️') ? (
                  <span className="text-yellow-400">{log}</span>
                ) : log.startsWith('❌') ? (
                  <span className="text-red-400">{log}</span>
                ) : (
                  <span className="text-zinc-100">{log}</span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
