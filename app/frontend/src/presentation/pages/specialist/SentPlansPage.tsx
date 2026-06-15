import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ClipboardList, Dumbbell, Loader2, RotateCcw, UtensilsCrossed } from 'lucide-react';
import { PlanViewModal } from '@/presentation/components/medical/PlanViewModal';
import type { PlanViewData } from '@/presentation/components/medical/PlanViewModal';
import { plansApi } from '@/infrastructure/api/plansApi';
import type { Plan } from '@/infrastructure/api/plansApi';

function planToViewData(plan: Plan): PlanViewData {
  return {
    message_id: plan.message_id,
    plan_type: plan.plan_type,
    title: plan.title,
    content: plan.content,
    sent_at: plan.sent_at,
  };
}

export const SentPlansPage = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanViewData | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const data = await plansApi.getSentPlans(true);
      setPlans(data);
    } catch {
      setError(t('sentPlans.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleArchive = async (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningId(plan.message_id);
    try {
      await plansApi.archivePlan(plan.message_id);
      await fetchPlans();
    } finally {
      setActioningId(null);
    }
  };

  const handleUnarchive = async (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningId(plan.message_id);
    try {
      await plansApi.unarchivePlan(plan.message_id);
      await fetchPlans();
    } finally {
      setActioningId(null);
    }
  };

  const active = plans.filter((p) => !p.is_archived);
  const archived = plans.filter((p) => p.is_archived);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-secondary text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-light rounded-3xl p-10 md:p-12 shadow-inner border border-brand-dark/5">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
            <ClipboardList className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-heading text-brand-dark tracking-wide">
              {t('sentPlans.pageTitle')}
            </h1>
            <p className="text-brand-dark/60 mt-1">{t('sentPlans.pageSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Active plans */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-dark/40 mb-3 px-1">
          {t('sentPlans.activeSection')}
        </h2>
        {active.length === 0 ? (
          <div className="bg-white/60 rounded-2xl border border-brand-dark/10 p-10 text-center">
            <ClipboardList className="w-8 h-8 text-brand-dark/20 mx-auto mb-3" />
            <p className="text-brand-dark/40 font-heading text-lg">{t('sentPlans.emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((plan) => (
              <SentPlanRow
                key={plan.message_id}
                plan={plan}
                actionLabel={t('sentPlans.archiveButton')}
                actionIcon={<Archive className="w-3.5 h-3.5" />}
                isActioning={actioningId === plan.message_id}
                onAction={(e) => handleArchive(plan, e)}
                onClick={() => setSelectedPlan(planToViewData(plan))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived divider + section */}
      {archived.length > 0 && (
        <>
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-brand-dark/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-dark/35 shrink-0 px-2">
              {t('sentPlans.archivedSection')}
            </span>
            <div className="flex-1 h-px bg-brand-dark/10" />
          </div>

          <section>
            <div className="space-y-3">
              {archived.map((plan) => (
                <SentPlanRow
                  key={plan.message_id}
                  plan={plan}
                  actionLabel={t('sentPlans.restoreButton')}
                  actionIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  isActioning={actioningId === plan.message_id}
                  onAction={(e) => handleUnarchive(plan, e)}
                  onClick={() => setSelectedPlan(planToViewData(plan))}
                  muted
                />
              ))}
            </div>
          </section>
        </>
      )}

      <PlanViewModal
        plan={selectedPlan}
        isOpen={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
};

interface SentPlanRowProps {
  plan: Plan;
  actionLabel: string;
  actionIcon: React.ReactNode;
  isActioning: boolean;
  onAction: (e: React.MouseEvent) => void;
  onClick: () => void;
  muted?: boolean;
}

function SentPlanRow({ plan, actionLabel, actionIcon, isActioning, onAction, onClick, muted }: SentPlanRowProps) {
  const { t } = useTranslation();
  const isMeal = plan.plan_type === 'MEAL_PLAN';
  const typeLabel = isMeal ? t('plans.viewModal.mealPlanLabel') : t('plans.viewModal.workoutPlanLabel');
  const sentAt = new Date(plan.sent_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`group bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-5 cursor-pointer
        hover:shadow-md hover:bg-white/80 hover:-translate-y-0.5 transition-all flex items-center gap-5
        ${muted ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      {/* Plan type icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
        ${isMeal ? 'bg-accent/10' : 'bg-secondary/10'}`}>
        {isMeal
          ? <UtensilsCrossed className="w-5 h-5 text-accent" />
          : <Dumbbell className="w-5 h-5 text-secondary" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full mb-1
          ${isMeal ? 'bg-accent/10 text-accent' : 'bg-secondary/10 text-secondary'}`}>
          {typeLabel}
        </span>
        <p className="font-heading text-xl text-brand-dark leading-tight truncate group-hover:text-accent transition-colors">
          {plan.title}
        </p>
        {/* sender_name holds patient_name on the specialist side */}
        <p className="text-xs text-brand-dark/50 mt-1">
          {plan.sender_name && (
            <span className="font-medium text-brand-dark/60 mr-1">{plan.sender_name} ·</span>
          )}
          {sentAt}
        </p>
      </div>

      {/* Archive / Restore button */}
      <button
        type="button"
        onClick={onAction}
        disabled={isActioning}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-dark/15
          text-brand-dark/50 text-xs font-bold uppercase tracking-widest
          hover:border-brand-dark/30 hover:text-brand-dark hover:bg-brand-dark/5
          transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : actionIcon}
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
