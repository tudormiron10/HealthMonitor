import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader2, MessageSquare, Search, User, X } from 'lucide-react';
import { chatApi } from '@/infrastructure/api/chatApi';
import { relationsApi } from '@/infrastructure/api/relationsApi';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import type { SpecialistResult } from '@/infrastructure/api/specialistApi';
import type { Relation } from '@/domain/models/Relation';
import {
  MEDICAL_SPECIALIZATIONS,
  NON_PHYSICIAN_SPECIALIZATIONS,
} from '@/domain/models/MedicalSpecialization';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import apiClient from '@/infrastructure/api/apiClient';
import { useChatContext } from '@/application/hooks/useChatContext';

const ALL_SPECIALIZATIONS = [...MEDICAL_SPECIALIZATIONS, ...NON_PHYSICIAN_SPECIALIZATIONS];

export const MySpecialistsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [approved, setApproved] = useState<Relation[]>([]);
  const [sent, setSent] = useState<Relation[]>([]);
  const [searchResults, setSearchResults] = useState<SpecialistResult[] | null>(null);

  const [nameQuery, setNameQuery] = useState('');
  const [specFilter, setSpecFilter] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [chatting, setChatting] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; relId: string | null }>({
    open: false,
    relId: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([relationsApi.getApproved(), relationsApi.getSent()])
      .then(([app, snt]) => {
        setApproved(app);
        setSent(snt);
      })
      .catch((err) => console.error('Error loading relations:', err))
      .finally(() => setLoadingData(false));
  }, [refreshKey]);

  const { latestRelationEvent, clearRelationEvent } = useChatContext();

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (
      latestRelationEvent?.status === 'ACTIVE' ||
      latestRelationEvent?.status === 'REJECTED' ||
      latestRelationEvent?.status === 'REVOKED'
    ) {
      handleRefresh();
      clearRelationEvent();
    }
  }, [latestRelationEvent, handleRefresh, clearRelationEvent]);

  const doSearch = useCallback(async (name: string, spec: string) => {
    setSearching(true);
    try {
      const results = await specialistApi.search({
        name: name || undefined,
        specialization: spec || undefined,
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!nameQuery && !specFilter) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(nameQuery, specFilter), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nameQuery, specFilter, doSearch]);

  const handleSearchButton = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(nameQuery, specFilter);
  };

  const handleRequest = async (targetUserId: string) => {
    setProcessing((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await relationsApi.request(targetUserId);
      handleRefresh();
    } catch (err) {
      console.error('Request error:', err);
    } finally {
      setProcessing((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleRevoke = async (relationId: string) => {
    setProcessing((prev) => ({ ...prev, [relationId]: true }));
    try {
      await relationsApi.revoke(relationId);
      handleRefresh();
    } catch (err) {
      console.error('Revoke error:', err);
    } finally {
      setProcessing((prev) => ({ ...prev, [relationId]: false }));
    }
  };

  const handleChat = async (specialistUserId: string) => {
    setChatting((prev) => ({ ...prev, [specialistUserId]: true }));
    try {
      const conv = await chatApi.openOrCreateConversation(specialistUserId);
      navigate(`/dashboard/messages/${conv.id}`);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatting((prev) => ({ ...prev, [specialistUserId]: false }));
    }
  };

  const getRelationToSpecialist = (specialistUserId: string) => {
    if (approved.find((r) => r.specialist_id === specialistUserId)) return 'approved';
    if (sent.find((r) => r.specialist_id === specialistUserId)) return 'pending';
    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/patient"
          className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
            {t('mySpecialists.title')}
          </h1>
          <p className="text-brand-dark/60 mt-1 font-medium">
            {t('mySpecialists.subtitle')}
          </p>
        </div>
      </div>

      {/* Search section */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6 space-y-4">
        <h2 className="font-heading text-xl text-brand-dark">
          {t('mySpecialists.search.title')}
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder={t('mySpecialists.search.namePlaceholder')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-brand-dark/15 bg-white/70 text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm"
          />
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-brand-dark/15 bg-white/70 text-brand-dark focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm"
          >
            <option value="">{t('mySpecialists.search.allSpecializations')}</option>
            {ALL_SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
          <button
            onClick={handleSearchButton}
            disabled={searching}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold uppercase tracking-widest transition-colors shrink-0"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{t('mySpecialists.search.button')}</span>
          </button>
        </div>

        {/* Search results */}
        {searchResults !== null && (
          <div className="space-y-2 pt-1">
            {searchResults.length === 0 ? (
              <p className="py-6 text-center text-brand-dark/40 font-heading text-lg">
                {t('mySpecialists.search.noResults')}
              </p>
            ) : (
              searchResults.map((result) => {
                const relStatus = getRelationToSpecialist(result.user_id);
                const isProcessing = processing[result.user_id] ?? false;

                return (
                  <div
                    key={result.user_id}
                    onClick={() => navigate(`/specialists/${result.user_id}`)}
                    className="flex items-center gap-3 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3 cursor-pointer hover:bg-white/80 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {result.photo_url ? (
                        <img
                          src={`${apiClient.defaults.baseURL}/${result.photo_url}`}
                          alt={`${result.first_name} ${result.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brand-dark truncate">
                        {result.first_name} {result.last_name}
                      </p>
                      {(result.headline || result.specialization) && (
                        <p className="text-xs text-brand-dark/50 truncate">
                          {result.headline || result.specialization}
                        </p>
                      )}
                    </div>
                    {relStatus === 'approved' ? (
                      <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest border border-green-200 shrink-0">
                        {t('mySpecialists.search.requestApproved')}
                      </span>
                    ) : relStatus === 'pending' ? (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest border border-amber-200 shrink-0">
                        {t('mySpecialists.search.requestPending')}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequest(result.user_id); }}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{t('mySpecialists.search.requestButton')}</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Active specialists */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-dark/5">
          <h2 className="font-heading text-xl text-brand-dark">
            {t('mySpecialists.active.title')}
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {loadingData &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-brand-dark/5 rounded-xl animate-pulse" />
            ))}

          {!loadingData && approved.length === 0 && (
            <p className="py-8 text-center text-brand-dark/40 font-heading text-lg">
              {t('mySpecialists.active.empty')}
            </p>
          )}

          {!loadingData &&
            approved.map((rel) => {
              const isProcessing = processing[rel.id] ?? false;
              const name = rel.counterparty
                ? `${rel.counterparty.first_name} ${rel.counterparty.last_name}`
                : rel.specialist_id;

              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0 overflow-hidden">
                    {rel.counterparty?.photo_url ? (
                      <img
                        src={`${apiClient.defaults.baseURL}/${rel.counterparty.photo_url}`}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{name}</p>
                    {(rel.counterparty?.headline || rel.counterparty?.specialization) && (
                      <p className="text-xs text-brand-dark/50 truncate">
                        {rel.counterparty?.headline || rel.counterparty?.specialization}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleChat(rel.specialist_id)}
                    disabled={chatting[rel.specialist_id] ?? false}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                  >
                    {chatting[rel.specialist_id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    <span>{t('mySpecialists.active.chatButton')}</span>
                  </button>
                  <button
                    onClick={() => setRevokeModal({ open: true, relId: rel.id })}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>{t('mySpecialists.active.revokeButton')}</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Pending sent requests */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-dark/5">
          <h2 className="font-heading text-xl text-brand-dark">
            {t('mySpecialists.pending.title')}
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {loadingData && (
            <div className="h-16 bg-brand-dark/5 rounded-xl animate-pulse" />
          )}

          {!loadingData && sent.length === 0 && (
            <p className="py-8 text-center text-brand-dark/40 font-heading text-lg">
              {t('mySpecialists.pending.empty')}
            </p>
          )}

          {!loadingData &&
            sent.map((rel) => {
              const isProcessing = processing[rel.id] ?? false;
              const name = rel.counterparty
                ? `${rel.counterparty.first_name} ${rel.counterparty.last_name}`
                : rel.specialist_id;

              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {rel.counterparty?.photo_url ? (
                      <img
                        src={`${apiClient.defaults.baseURL}/${rel.counterparty.photo_url}`}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{name}</p>
                    {(rel.counterparty?.headline || rel.counterparty?.specialization) && (
                      <p className="text-xs text-brand-dark/50 truncate">
                        {rel.counterparty?.headline || rel.counterparty?.specialization}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(rel.id)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>{t('mySpecialists.pending.cancelButton')}</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>
      <ConfirmModal
        open={revokeModal.open}
        title={t('mySpecialists.active.revokeTitle')}
        message={t('mySpecialists.active.revokeConfirm')}
        danger
        onConfirm={() => {
          if (revokeModal.relId) handleRevoke(revokeModal.relId);
          setRevokeModal({ open: false, relId: null });
        }}
        onCancel={() => setRevokeModal({ open: false, relId: null })}
      />
    </div>
  );
};
