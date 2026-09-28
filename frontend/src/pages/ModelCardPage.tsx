import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';

export const ModelCardPage: React.FC = () => {
  const [modelCard, setModelCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getModelCard()
      .then(setModelCard)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !modelCard) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-xs text-[#858585]">
        [LOADING MODEL CARD METADATA & VALIDATION ARTIFACTS...]
      </div>
    );
  }

  const { models, dataset_splits, candidate_model_comparisons, known_limitations } = modelCard;

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Model Card & Methodological Transparency
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Full empirical documentation of dataset splits, target definitions, candidate benchmark comparisons, and validation metrics.
          </p>
        </div>

        <div className="text-xs font-mono px-2 py-0.5 rounded bg-[#252526] border border-[#2d3139] text-[#cccccc]">
          SUITE: <span className="text-white font-bold">{modelCard.model_suite}</span>
        </div>
      </div>

      {/* Dataset & Partition Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <MetricCard
          title="Training Set"
          value={`${dataset_splits.train_samples.toLocaleString()} Samples`}
          subtitle={`Snapshots: ${dataset_splits.training_period}`}
          borderAccent="border-blue-500"
        />
        <MetricCard
          title="Validation Set"
          value={`${dataset_splits.validation_samples.toLocaleString()} Samples`}
          subtitle={`Snapshot: ${dataset_splits.validation_period}`}
          borderAccent="border-amber-500"
        />
        <MetricCard
          title="Temporal Holdout"
          value={`${dataset_splits.holdout_samples.toLocaleString()} Samples`}
          subtitle={`Snapshot: ${dataset_splits.holdout_period} (Unseen)`}
          borderAccent="border-emerald-500"
        />
        <MetricCard
          title="Longitudinal Projects"
          value={dataset_splits.longitudinal_core_projects.toLocaleString()}
          subtitle="Observed across all 4 consecutive months"
          borderAccent="border-purple-500"
        />
      </div>

      {/* Model Specifications Section */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3 space-y-3">
        <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider flex items-center justify-between border-b border-[#2d3139] pb-1.5">
          <span>Trained Supervised Risk Models</span>
          <span className="text-[10px] text-[#858585]">NEXT-MONTH DETERIORATION TARGETS</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {models.map((m: any) => (
            <div key={m.id} className="p-2.5 bg-[#1e1e1e] rounded border border-[#2d3139] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-xs">{m.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/30 font-semibold">
                  [{m.selected_algorithm}]
                </span>
              </div>
              <div className="text-xs text-[#858585] font-sans">
                <span className="text-[#cccccc] font-semibold">Target:</span> {m.target_definition}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs border-t border-[#2d3139]">
                <div>
                  <div className="text-[10px] text-[#858585]">ROC-AUC</div>
                  <div className="text-white font-bold">{m.validation_roc_auc.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#858585]">PR-AUC</div>
                  <div className="text-white font-bold">{m.validation_pr_auc.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#858585]">F1 SCORE</div>
                  <div className="text-white font-bold">{m.validation_f1.toFixed(4)}</div>
                </div>
              </div>
              <div className="text-[11px] text-[#aaaaaa] font-sans italic bg-[#252526] p-1.5 rounded border border-[#333333]">
                "{m.rationale}"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Model Benchmark Comparison */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
        <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
          Candidate Algorithm Comparison (June 2026 Validation Split)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#2d3139] text-[#858585]">
              <tr>
                <th className="pb-1">Failure Mode</th>
                <th className="pb-1">Model Candidate</th>
                <th className="pb-1 text-right">ROC-AUC</th>
                <th className="pb-1 text-right">PR-AUC</th>
                <th className="pb-1 text-right">Precision</th>
                <th className="pb-1 text-right">Recall</th>
                <th className="pb-1 text-right">F1 Score</th>
                <th className="pb-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3139]/60">
              {Object.entries(candidate_model_comparisons).map(([targetKey, tData]: [string, any]) => (
                Object.entries(tData.comparison).map(([mName, metrics]: [string, any]) => {
                  const isSelected = tData.selected_model === mName;
                  return (
                    <tr key={`${targetKey}-${mName}`} className={isSelected ? 'bg-[#007acc]/10 font-medium' : 'hover:bg-[#2a2d2e]/50'}>
                      <td className="py-1.5 text-[#cccccc] capitalize">{targetKey} Risk</td>
                      <td className="py-1.5 text-white">{mName}</td>
                      <td className="py-1.5 text-right text-white font-bold">{metrics.roc_auc.toFixed(4)}</td>
                      <td className="py-1.5 text-right text-[#007acc] font-bold">{metrics.pr_auc.toFixed(4)}</td>
                      <td className="py-1.5 text-right text-[#858585]">{metrics.precision.toFixed(4)}</td>
                      <td className="py-1.5 text-right text-[#858585]">{metrics.recall.toFixed(4)}</td>
                      <td className="py-1.5 text-right text-[#858585]">{metrics.f1.toFixed(4)}</td>
                      <td className="py-1.5 text-center">
                        {isSelected ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            [SELECTED]
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#858585]">[CANDIDATE]</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodological Limitations & Integrity */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3 space-y-1.5">
        <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
          [DOCUMENTED METHODOLOGICAL LIMITATIONS & GUARDRAILS]
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs text-[#cccccc] font-sans pl-1">
          {known_limitations.map((lim: string, idx: number) => (
            <li key={idx} className="leading-relaxed">{lim}</li>
          ))}
        </ul>
      </div>

    </div>
  );
};
