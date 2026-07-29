'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import Toast from '@/components/Toast';
import TabBar from '@/components/TabBar';
import AvatarUpload from '@/components/AvatarUpload';
import SwipeableViews from '@/components/SwipeableViews';
import EmojiBurst from '@/components/EmojiBurst';
import MissionRequestSheet from '@/components/MissionRequestSheet';
import ShopItemProposalSheet from '@/components/ShopItemProposalSheet';
import MissionProposalSheet from '@/components/MissionProposalSheet';
import ReorderableList from '@/components/ReorderableList';
import { useUnlockAudio } from '@/hooks/useUnlockAudio';
import { playChime, playSend } from '@/lib/sound';
import {
  getChildData,
  buyCoupon,
  useCoupon,
  updateChildPhoto,
  requestMission,
  requestCustomMission,
  proposeShopItem,
  proposeMission,
  reorderShopItems,
  reorderMissions,
} from './actions';

const TABS = [
  { id: 'shop', label: '상점', icon: '🛍️' },
  { id: 'missions', label: '미션', icon: '🎯' },
  { id: 'coupons', label: '내 쿠폰', icon: '🎟️' },
  { id: 'history', label: '기록', icon: '📜' },
];
const TAB_IDS = TABS.map((t) => t.id);

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
  sort_order?: number | null;
}

interface Coupon {
  id: string;
  emoji: string;
  name: string;
  used: boolean;
  purchased_at: string;
}

interface Transaction {
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Mission {
  id: string;
  emoji: string;
  name: string;
  reward: number;
  sort_order?: number | null;
}

interface MyRequest {
  id: string;
  emoji: string;
  name: string;
  reward: number | null;
  status: 'pending' | 'approved' | 'rejected';
  is_custom: boolean;
  requested_at: string;
}

const STATUS_LABEL: Record<MyRequest['status'], string> = {
  pending: '⏳ 기다리는 중',
  approved: '✅ 승인됐어요',
  rejected: '❌ 거절됐어요',
};

interface MyShopRequest {
  id: string;
  emoji: string;
  name: string;
  requested_price: number;
  final_price: number | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

interface MyMissionProposal {
  id: string;
  emoji: string;
  name: string;
  requested_reward: number;
  final_reward: number | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

function ChildContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'parent';
  useUnlockAudio();

  const [activeTab, setActiveTab] = useState<string>('shop');
  const [balance, setBalance] = useState<number>(0);
  const [childName, setChildName] = useState<string>('나');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [pendingMissionIds, setPendingMissionIds] = useState<string[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [myShopRequests, setMyShopRequests] = useState<MyShopRequest[]>([]);
  const [myMissionProposals, setMyMissionProposals] = useState<MyMissionProposal[]>([]);
  const [toast, setToast] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMission, setSheetMission] = useState<Mission | undefined>(undefined);
  const [shopProposalOpen, setShopProposalOpen] = useState(false);
  const [missionProposalOpen, setMissionProposalOpen] = useState(false);

  const [burstEmojis, setBurstEmojis] = useState<string[]>(['💖', '✨', '🎉']);
  const [burstTrigger, setBurstTrigger] = useState(0);

  const prevBalance = useRef<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getChildData();
        if (data.child) {
          const newBalance = (data.child as any).balance;
          if (prevBalance.current !== null && newBalance > prevBalance.current) {
            const gained = newBalance - prevBalance.current;
            setBurstEmojis(['💖', '✨', '🎉']);
            setBurstTrigger((t) => t + 1);
            playChime();
            setToast(`+${gained} 하트를 받았어요! 🎉`);
          }
          prevBalance.current = newBalance;
          setBalance(newBalance);
          setChildName((data.child as any).name || '나');
          setPhotoUrl((data.child as any).photo_data || null);
        }
        if (data.shops) setShops(data.shops as ShopItem[]);
        if (data.coupons) setCoupons(data.coupons as Coupon[]);
        if (data.transactions) setTransactions(data.transactions as Transaction[]);
        if (data.missions) setMissions(data.missions as Mission[]);
        if (data.pendingMissionIds) setPendingMissionIds(data.pendingMissionIds as string[]);
        if (data.myRequests) setMyRequests(data.myRequests as MyRequest[]);
        if (data.myShopRequests) setMyShopRequests(data.myShopRequests as MyShopRequest[]);
        if (data.myMissionProposals) setMyMissionProposals(data.myMissionProposals as MyMissionProposal[]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePhotoUpload = async (dataUrl: string) => {
    try {
      await updateChildPhoto(dataUrl);
      setPhotoUrl(dataUrl);
      setToast('사진을 바꿨어요! 📷');
    } catch (error) {
      setToast('사진 저장에 실패했어요');
      console.error(error);
    }
  };

  const handleBuyCoupon = async (item: ShopItem) => {
    if (balance < item.price) {
      setToast('하트가 부족해요');
      return;
    }
    if (!window.confirm(`"${item.name}" 쿠폰을 ${item.price}하트로 살까요?`)) return;

    try {
      setIsLoading(true);
      await buyCoupon(item.id);
      prevBalance.current = balance - item.price;
      setBalance(balance - item.price);
      setCoupons([
        {
          id: Math.random().toString(),
          emoji: item.emoji,
          name: item.name,
          used: false,
          purchased_at: new Date().toISOString(),
        },
        ...coupons,
      ]);
      setToast('쿠폰을 샀어요! 🎉');

      const data = await getChildData();
      if (data.child) setBalance((data.child as any).balance);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCoupon = async (couponId: string, couponName: string) => {
    if (!window.confirm(`"${couponName}" 쿠폰을 지금 사용할까요?\n부모님께 보여주세요!`)) return;

    try {
      setIsLoading(true);
      await useCoupon(couponId);
      setCoupons(coupons.map((c) => (c.id === couponId ? { ...c, used: true } : c)));
      setToast('쿠폰 사용! 즐거운 시간 보내 ✨');

      const data = await getChildData();
      if (data.coupons) setCoupons(data.coupons as Coupon[]);
    } catch (error) {
      setToast('오류가 발생했어요');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openMissionSheet = (mission?: Mission) => {
    setSheetMission(mission);
    setSheetOpen(true);
  };

  const handleSheetSubmit = async (data: { missionId?: string; description?: string; emoji?: string; photoData: string | null }) => {
    if (data.missionId) {
      await requestMission(data.missionId, data.photoData);
    } else {
      await requestCustomMission(data.description || '', data.photoData, data.emoji);
    }

    setSheetOpen(false);
    setBurstEmojis(['✨', '💌', '🚀']);
    setBurstTrigger((t) => t + 1);
    playSend();
    setToast('요청을 보냈어요! 부모님을 기다려주세요 💌');

    const refreshed = await getChildData();
    if (refreshed.missions) setMissions(refreshed.missions as Mission[]);
    if (refreshed.pendingMissionIds) setPendingMissionIds(refreshed.pendingMissionIds as string[]);
    if (refreshed.myRequests) setMyRequests(refreshed.myRequests as MyRequest[]);
  };

  const handleReorderShop = async (newOrder: ShopItem[]) => {
    setShops(newOrder);
    try {
      await reorderShopItems(newOrder.map((s) => s.id));
    } catch (error) {
      console.error('Error reordering shop items:', error);
    }
  };

  const handleReorderMissions = async (newOrder: Mission[]) => {
    setMissions(newOrder);
    try {
      await reorderMissions(newOrder.map((m) => m.id));
    } catch (error) {
      console.error('Error reordering missions:', error);
    }
  };

  const handleProposeShopItem = async (data: { emoji: string; name: string; price: number }) => {
    await proposeShopItem(data.emoji, data.name, data.price);
    setShopProposalOpen(false);
    setBurstEmojis(['✨', '💌', '🛍️']);
    setBurstTrigger((t) => t + 1);
    playSend();
    setToast('제안을 보냈어요! 부모님을 기다려주세요 💌');

    const refreshed = await getChildData();
    if (refreshed.myShopRequests) setMyShopRequests(refreshed.myShopRequests as MyShopRequest[]);
  };

  const handleProposeMission = async (data: { emoji: string; name: string; reward: number }) => {
    await proposeMission(data.emoji, data.name, data.reward);
    setMissionProposalOpen(false);
    setBurstEmojis(['✨', '💌', '🎯']);
    setBurstTrigger((t) => t + 1);
    playSend();
    setToast('제안을 보냈어요! 부모님을 기다려주세요 💌');

    const refreshed = await getChildData();
    if (refreshed.myMissionProposals) setMyMissionProposals(refreshed.myMissionProposals as MyMissionProposal[]);
  };

  const handleExit = () => {
    router.push(isPreview ? '/parent' : '/');
  };

  const activeIndex = Math.max(TAB_IDS.indexOf(activeTab), 0);

  if (isLoading && balance === 0 && shops.length === 0) {
    return <div className="text-center pt-24 text-[#8e8e93]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 safe-top">
        {isPreview && (
          <div className="flex items-center gap-1.5 mb-3 text-[12px] font-semibold text-purple-600 bg-purple-50 rounded-full px-3 py-1.5 w-fit">
            <span>👀</span>
            <span>부모님 미리보기 모드</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <AvatarUpload
              photoUrl={photoUrl}
              editable={!isPreview}
              size={56}
              onUpload={handlePhotoUpload}
              fallbackEmoji="👧"
            />
            <div>
              <p className="text-[13px] text-[#8e8e93]">안녕하세요</p>
              <p className="text-[19px] font-bold text-[#1c1c1e]">{childName}</p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="text-[13px] font-medium text-[#8e8e93] px-3 py-1.5 rounded-full bg-black/5 active:bg-black/10 transition-colors"
          >
            {isPreview ? '돌아가기' : '나가기'}
          </button>
        </div>

        {/* Balance Hero Card */}
        <div className="relative">
          <div className="rounded-3xl p-6 bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 shadow-lg shadow-pink-500/25 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-8xl opacity-20">💖</div>
            <p className="text-white/80 text-[13px] font-medium relative">내가 모은 하트</p>
            <p className="text-white text-[44px] font-bold leading-tight mt-1 relative">
              {balance}
              <span className="text-2xl ml-2">💖</span>
            </p>
          </div>
          <EmojiBurst trigger={burstTrigger} emojis={burstEmojis} />
        </div>
      </div>

      {/* Content */}
      <SwipeableViews
        activeIndex={activeIndex}
        onIndexChange={(i) => setActiveTab(TAB_IDS[i])}
      >
        {[
          <div key="shop" className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              {shops.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">상점이 비어있어요</p>
              ) : (
                <ReorderableList
                  items={shops}
                  onReorder={handleReorderShop}
                  renderItem={(item) => (
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06]">
                      <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-xl shrink-0">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{item.name}</p>
                        <p className="text-[13px] font-semibold text-pink-500">{item.price} 💖</p>
                      </div>
                      <button
                        onClick={() => handleBuyCoupon(item)}
                        disabled={isLoading || balance < item.price}
                        className={`px-4 py-2 rounded-full font-semibold text-[13px] shrink-0 transition-all active:scale-95 ${
                          balance >= item.price
                            ? 'bg-[#1c1c1e] text-white'
                            : 'bg-black/5 text-[#c7c7cc]'
                        }`}
                      >
                        사기
                      </button>
                    </div>
                  )}
                />
              )}
            </div>

            <p className="text-[12px] text-[#8e8e93] text-center px-4">⠿ 을 눌러서 위아래로 끌면 순서를 바꿀 수 있어요</p>

            <button
              onClick={() => setShopProposalOpen(true)}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-200 text-purple-500 font-semibold text-[14px] active:bg-purple-50 transition-colors"
            >
              🛍️ 새 아이템 제안하기
            </button>

            {myShopRequests.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
                <p className="text-[13px] font-semibold text-[#8e8e93] px-4 pt-4 pb-2">내가 제안한 아이템</p>
                {myShopRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx !== myShopRequests.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <span className="text-lg shrink-0">{req.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] text-[#1c1c1e] truncate">{req.name}</p>
                      <p className="text-[12px] text-[#8e8e93]">
                        {new Date(req.requested_at).toLocaleDateString('ko-KR')}
                        {req.status === 'approved' && req.final_price !== null && (
                          <span className="ml-1.5 font-semibold text-green-600">{req.final_price} 💖</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium text-[#8e8e93] shrink-0">
                      {req.status === 'pending' ? '⏳ 기다리는 중' : req.status === 'approved' ? '✅ 승인됐어요' : '❌ 거절됐어요'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>,

          <div key="missions" className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
              {missions.length === 0 ? (
                <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 미션이 없어요</p>
              ) : (
                <ReorderableList
                  items={missions}
                  onReorder={handleReorderMissions}
                  renderItem={(mission) => {
                    const isPending = pendingMissionIds.includes(mission.id);
                    return (
                      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06]">
                        <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                          {mission.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{mission.name}</p>
                          <p className="text-[13px] font-semibold text-pink-500">{mission.reward} 💖</p>
                        </div>
                        <button
                          onClick={() => openMissionSheet(mission)}
                          disabled={isPending}
                          className={`px-4 py-2 rounded-full font-semibold text-[13px] shrink-0 transition-all active:scale-95 ${
                            isPending ? 'bg-black/5 text-[#c7c7cc]' : 'bg-[#1c1c1e] text-white'
                          }`}
                        >
                          {isPending ? '요청중' : '요청하기'}
                        </button>
                      </div>
                    );
                  }}
                />
              )}
            </div>

            <p className="text-[12px] text-[#8e8e93] text-center px-4">⠿ 을 눌러서 위아래로 끌면 순서를 바꿀 수 있어요</p>

            <button
              onClick={() => openMissionSheet(undefined)}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-200 text-purple-500 font-semibold text-[14px] active:bg-purple-50 transition-colors"
            >
              ✨ 다른 걸 했어요! 직접 요청하기
            </button>

            <button
              onClick={() => setMissionProposalOpen(true)}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-purple-200 text-purple-500 font-semibold text-[14px] active:bg-purple-50 transition-colors"
            >
              🎯 새 미션 만들어달라고 하기
            </button>

            {myMissionProposals.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
                <p className="text-[13px] font-semibold text-[#8e8e93] px-4 pt-4 pb-2">내가 제안한 미션</p>
                {myMissionProposals.map((req, idx) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx !== myMissionProposals.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <span className="text-lg shrink-0">{req.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] text-[#1c1c1e] truncate">{req.name}</p>
                      <p className="text-[12px] text-[#8e8e93]">
                        {new Date(req.requested_at).toLocaleDateString('ko-KR')}
                        {req.status === 'approved' && req.final_reward !== null && (
                          <span className="ml-1.5 font-semibold text-green-600">{req.final_reward} 💖</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium text-[#8e8e93] shrink-0">
                      {req.status === 'pending' ? '⏳ 기다리는 중' : req.status === 'approved' ? '✅ 승인됐어요' : '❌ 거절됐어요'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {myRequests.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
                <p className="text-[13px] font-semibold text-[#8e8e93] px-4 pt-4 pb-2">내 요청 기록</p>
                {myRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx !== myRequests.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                  >
                    <span className="text-lg shrink-0">{req.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] text-[#1c1c1e] truncate">{req.name}</p>
                      <p className="text-[12px] text-[#8e8e93]">
                        {new Date(req.requested_at).toLocaleDateString('ko-KR')}
                        {req.status === 'approved' && req.reward !== null && (
                          <span className="ml-1.5 font-semibold text-green-600">+{req.reward} 💖</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium text-[#8e8e93] shrink-0">{STATUS_LABEL[req.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>,

          <div key="coupons" className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {coupons.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 쿠폰이 없어요</p>
            ) : (
              coupons.map((coupon, idx) => (
                <div
                  key={coupon.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx !== coupons.length - 1 ? 'border-b border-black/[0.06]' : ''} ${coupon.used ? 'opacity-40' : ''}`}
                >
                  <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                    {coupon.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{coupon.name}</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {new Date(coupon.purchased_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {coupon.used ? (
                    <span className="text-[12px] font-medium text-[#8e8e93] shrink-0">사용완료 ✔</span>
                  ) : (
                    <button
                      onClick={() => handleUseCoupon(coupon.id, coupon.name)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-full font-semibold text-[13px] bg-purple-600 text-white shrink-0 active:scale-95 transition-all"
                    >
                      사용하기
                    </button>
                  )}
                </div>
              ))
            )}
          </div>,

          <div key="history" className="rounded-2xl bg-white shadow-sm border border-black/5 overflow-hidden">
            {transactions.length === 0 ? (
              <p className="text-center text-[#8e8e93] py-10 text-[15px]">아직 기록이 없어요</p>
            ) : (
              transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center px-4 py-3.5 ${idx !== transactions.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] text-[#1c1c1e] truncate">{tx.description}</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <p className={`font-semibold text-[15px] shrink-0 ${tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-500' : 'text-[#8e8e93]'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 💖
                  </p>
                </div>
              ))
            )}
          </div>,
        ]}
      </SwipeableViews>

      <TabBar items={TABS} activeId={activeTab} onChange={setActiveTab} accentColor="#db2777" />
      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />

      {sheetOpen && (
        <MissionRequestSheet
          mission={sheetMission}
          onClose={() => setSheetOpen(false)}
          onSubmit={handleSheetSubmit}
        />
      )}

      {shopProposalOpen && (
        <ShopItemProposalSheet
          onClose={() => setShopProposalOpen(false)}
          onSubmit={handleProposeShopItem}
        />
      )}

      {missionProposalOpen && (
        <MissionProposalSheet
          onClose={() => setMissionProposalOpen(false)}
          onSubmit={handleProposeMission}
        />
      )}
    </div>
  );
}

export default function ChildPage() {
  return (
    <Suspense fallback={<div className="text-center pt-24 text-[#8e8e93]">로딩 중...</div>}>
      <ChildContent />
    </Suspense>
  );
}
