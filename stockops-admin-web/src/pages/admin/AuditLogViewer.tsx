import { useState } from 'react'

export function AuditLogViewer() {
  const [logs] = useState<Array<{id: number; actor: string; action: string; target: string; timestamp: string}>>([])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">감사 로그</h1>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">시간</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">작업자</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">작업</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">대상</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">로그 데이터가 없습니다.</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm text-neutral-500">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900">{log.actor}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{log.action}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{log.target}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}