/**
 * Settings page with tabbed navigation for system configuration.
 * Provides UI for general settings, user management, permissions, notifications, API, and backup.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Users, Shield, Bell, Key, Database, ChevronRight, Plus, MessageCircle } from 'lucide-react'

type TabId = 'general' | 'users' | 'permissions' | 'notifications' | 'api' | 'backup'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'general', label: '일반', icon: Settings },
  { id: 'users', label: '사용자 관리', icon: Users },
  { id: 'permissions', label: '권한 설정', icon: Shield },
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'api', label: 'API & 연동', icon: Key },
  { id: 'backup', label: '백업 & 복구', icon: Database },
]

const mockUsers = [
  { id: 1, name: '김점장', email: 'kim@store.com', role: '센터 관리자' },
  { id: 2, name: '이직원', email: 'lee@store.com', role: '창고 직원' },
  { id: 3, name: '박직원', email: 'park@store.com', role: '창고 직원' },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">설정</h1>
        <p className="text-text-secondary mt-1">시스템 설정 및 관리를 확인하세요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 bg-white rounded-xl border border-neutral-200 p-2 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 min-h-[44px] rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-text-secondary hover:bg-neutral-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-neutral-200 p-6">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'permissions' && <PermissionsSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'api' && <ApiSettings />}
          {activeTab === 'backup' && <BackupSettings />}
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">일반 설정</h2>

      <div className="space-y-4">
        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">창고 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">창고명</label>
              <input type="text" defaultValue="강남센터" className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">창고 ID</label>
              <input type="text" defaultValue="gangnam-center" readOnly className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-200 rounded-lg bg-neutral-50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">주소</label>
              <input type="text" defaultValue="서울특별시 강남구 테헤란로 123" className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">시스템 설정</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">언어</label>
              <select className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg">
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">시간대</label>
              <select className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg">
                <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-neutral-200">
          <button type="button" className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded-lg hover:bg-neutral-50">초기화</button>
          <button type="button" className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700">저장</button>
        </div>
      </div>
    </div>
  )
}

function UsersSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">사용자 관리</h2>
        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" />
          사용자 추가
        </button>
      </div>

      <div className="space-y-3">
        {mockUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                {user.name.slice(0, 1)}
              </span>
              <div>
                <p className="font-medium text-text-primary">{user.name}</p>
                <p className="text-sm text-text-secondary">{user.email}</p>
                <span className="text-xs text-text-light">{user.role}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 min-h-[40px] text-sm border border-neutral-300 rounded hover:bg-neutral-100">수정</button>
              {user.id !== 1 && (
                <button type="button" className="px-3 py-2 min-h-[40px] text-sm text-error border border-error rounded hover:bg-red-50">비활성화</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PermissionsSettings() {
  const features = ['재고 조회', '재고 수정', '입출고 등록', '재고 조정', '사용자 관리', '설정 변경']
  const roles = ['점주', '창고관리자', '직원', '감사자']

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">권한 설정</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">기능</th>
              {roles.map((role) => (
                <th key={role} className="text-center py-3 px-4 text-sm font-medium text-text-secondary">{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature} className="border-b border-neutral-100">
                <td className="py-3 px-4 text-text-primary">{feature}</td>
                {roles.map((_, roleIdx) => (
                  <td key={roleIdx} className="text-center py-3 px-4">
                    <input
                      type="checkbox"
                      disabled={roleIdx === 0}
                      defaultChecked={roleIdx === 0 || roleIdx === 1}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-4 border-t border-neutral-200">
        <button type="button" className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700">권한 저장</button>
      </div>
    </div>
  )
}

function NotificationsSettings() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">알림 설정</h2>

      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">알림 채널 상세 설정</h3>
              <p className="text-sm text-blue-700 mt-1">알림 유형별로 SMS, 이메일, 웹훅 채널을 설정하세요.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/notification-channels')}
              className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              채널 설정 관리
            </button>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">알림 채널</h3>
          <div className="space-y-2">
            {['앱 푸시 알림', '이메일 알림', 'SMS 알림'].map((channel, idx) => (
              <label key={channel} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100">
                <input type="checkbox" defaultChecked={idx < 2} className="w-4 h-4 rounded" />
                <span className="text-text-primary">{channel}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">알림 유형</h3>
          <div className="space-y-2">
            {['재고 부족 알림', '유통기한 임박 알림', '환경 이상 알림', 'AI 발주 제안 알림'].map((type, idx) => (
              <label key={type} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100">
                <input type="checkbox" defaultChecked={idx < 3} className="w-4 h-4 rounded" />
                <span className="text-text-primary">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-200">
          <button type="button" className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700">저장</button>
        </div>
      </div>
    </div>
  )
}

function ApiSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">API & 연동</h2>

      <div className="space-y-4">
        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">API 키</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Production API Key</p>
                <code className="text-sm text-text-secondary">sk_live_51HYs...8x2m</code>
              </div>
              <div className="flex gap-2">
                <button type="button" className="px-3 py-2 min-h-[40px] text-sm border border-neutral-300 rounded hover:bg-neutral-100">복사</button>
                <button type="button" className="px-3 py-2 min-h-[40px] text-sm text-error border border-error rounded hover:bg-red-50">재생성</button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Test API Key</p>
                <code className="text-sm text-text-secondary">sk_test_51HYs...9x3n</code>
              </div>
              <div className="flex gap-2">
                <button type="button" className="px-3 py-2 min-h-[40px] text-sm border border-neutral-300 rounded hover:bg-neutral-100">복사</button>
                <button type="button" className="px-3 py-2 min-h-[40px] text-sm text-error border border-error rounded hover:bg-red-50">재생성</button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">외부 연동</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-text-primary">슬랙</span>
                <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">연결됨</span>
              </div>
              <button type="button" className="px-3 py-2 min-h-[40px] text-sm border border-neutral-300 rounded hover:bg-neutral-100">설정</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-neutral-500" />
                <span className="font-medium text-text-primary">카카오톡</span>
                <span className="px-2 py-0.5 text-xs bg-neutral-200 text-text-secondary rounded">연결 안됨</span>
              </div>
              <button type="button" className="px-3 py-2 min-h-[40px] text-sm bg-primary-600 text-white rounded hover:bg-primary-700">연결</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const backupHistory = [
  { date: '2024-05-20 03:00', size: '45.2 MB', status: '완료' },
  { date: '2024-05-19 03:00', size: '44.8 MB', status: '완료' },
  { date: '2024-05-18 03:00', size: '44.5 MB', status: '완료' },
]

function BackupSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">백업 & 복구</h2>

      <div className="space-y-6">
        <div className="p-4 bg-neutral-50 rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-3">자동 백업</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-light">마지막 백업</p>
              <p className="font-medium">2024-05-20 03:00</p>
            </div>
            <div>
              <p className="text-xs text-text-light">다음 백업</p>
              <p className="font-medium">2024-05-21 03:00</p>
            </div>
            <div>
              <p className="text-xs text-text-light">백업 주기</p>
              <p className="font-medium">매일 03:00</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700">지금 백업</button>
            <button type="button" className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded-lg hover:bg-neutral-100">백업 설정</button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">백업 이력</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">날짜</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">크기</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">상태</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">관리</th>
              </tr>
            </thead>
            <tbody>
              {backupHistory.map((backup) => (
                <tr key={backup.date} className="border-b border-neutral-100">
                  <td className="py-2 px-3 text-sm">{backup.date}</td>
                  <td className="py-2 px-3 text-sm">{backup.size}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">{backup.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button type="button" className="px-3 py-2 min-h-[36px] text-xs border border-neutral-300 rounded hover:bg-neutral-100">다운로드</button>
                      <button type="button" className="px-3 py-2 min-h-[36px] text-xs border border-neutral-300 rounded hover:bg-neutral-100">복구</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
