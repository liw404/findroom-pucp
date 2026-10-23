import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Sparkles, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { createStudentEvaluation } from '../services/api';
import { TenantLeaseItem } from '../types/room';

const BEHAVIOR_TAGS = [
  'Puntualidad en pagos',
  'Excelente comunicación',
  'Cuidado de las instalaciones',
  'Respeto de normas',
] as const;

const RATING_LABELS: Record<number, string> = {
  1: 'Convivencia muy difícil',
  2: 'Incumplimientos frecuentes',
  3: 'Convivencia regular',
  4: 'Buen inquilino y responsable',
  5: 'Inquilino ejemplar y puntual',
};

interface RateStudentModalProps {
  isOpen: boolean;
  lease: TenantLeaseItem | null;
  landlordId: string;
  landlordName: string;
  onClose: () => void;
  onSuccess?: (result: {
    newAverageRating: number;
    totalEvaluations: number;
  }) => void;
}

export const RateStudentModal: React.FC<RateStudentModalProps> = ({
  isOpen,
  lease,
  landlordId,
  landlordName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Puntualidad en pagos',
    'Respeto de normas',
  ]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !lease) return null;

  const studentDisplayName =
    lease?.student?.fullName ??
    lease?.student?.name ??
    lease?.studentName ??
    'Mateo Salazar';
  const studentFacultad =
    lease?.student?.facultad ??
    lease?.studentFacultad ??
    'Ciencias e Ingeniería';

  const trimmedLength = comment.trim().length;
  const isCommentValid = trimmedLength >= 30 && trimmedLength <= 300;
  const isLeaseFinished = lease?.status === 'FINALIZADO';
  const canSubmit = isLeaseFinished && isCommentValid && !isSubmitting;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const result = createStudentEvaluation({
        contractId: lease?.id,
        studentId: lease?.studentId,
        landlordId,
        landlordName,
        roomTitle: lease?.roomTitle,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });

      toast.success('Calificación registrada para el inquilino', {
        description: `Nuevo promedio de ${studentDisplayName}: ${result.newAverageRating.toFixed(1)} estrellas (${result.totalEvaluations} evaluaciones).`,
      });

      setComment('');
      onSuccess?.({
        newAverageRating: result.newAverageRating,
        totalEvaluations: result.totalEvaluations,
      });
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la evaluación del inquilino.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStarDisplay = hoveredRating ?? rating;

  return createPortal(
    <div
      className="fixed inset-0 top-0 left-0 w-screen h-screen m-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 overflow-y-auto"
      style={{
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-royal">
              Evaluación de Arriendo Finalizado
            </span>
            <h2 className="text-base font-bold text-navy mt-0.5">
              Calificar a {studentDisplayName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resumen del contrato */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-navy truncate">
                {lease?.roomTitle ?? 'Habitación'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Facultad: {studentFacultad} • Periodo: {lease?.periodLabel ?? 'Semestral'}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-verified">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Contrato Finalizado
            </span>
          </div>

          {/* Selector de 1 a 5 estrellas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Calificación general (1 a 5 estrellas)
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 bg-white">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= activeStarDisplay;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                      aria-label={`${star} estrellas`}
                    >
                      <Star
                        className={`w-6 h-6 transition-transform ${
                          active
                            ? 'text-amber-400 fill-amber-400 scale-105'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-sm font-extrabold text-navy">
                  {activeStarDisplay}.0 / 5.0
                </p>
                <p className="text-xs text-slate-500">
                  {RATING_LABELS[activeStarDisplay]}
                </p>
              </div>
            </div>
          </div>

          {/* Etiquetas rápidas de comportamiento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Aspectos destacados del comportamiento
            </label>
            <div className="flex flex-wrap gap-2">
              {BEHAVIOR_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                      selected
                        ? 'bg-royal/10 text-royal border-royal/30 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comentario con contador estricto de 30 a 300 caracteres */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Reseña sobre convivencia y cuidado del inmueble
              </label>
              <span
                className={`text-xs font-semibold ${
                  isCommentValid
                    ? 'text-verified'
                    : trimmedLength > 300
                      ? 'text-red-600'
                      : 'text-slate-400'
                }`}
              >
                {trimmedLength} / 300 caracteres (mín. 30)
              </span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={320}
              placeholder="Describe la puntualidad en los pagos, respeto de las normas de convivencia y el estado en que entregó la habitación..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-royal focus:outline-none"
            />
            {!isCommentValid && (
              <p className="mt-1 text-[11px] text-slate-500">
                Ingresa entre 30 y 300 caracteres para respaldar la reputación del
                estudiante en la comunidad.
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all ${
                canSubmit
                  ? 'bg-navy text-white hover:bg-slate-800 shadow-sm cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Guardar calificación
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RateStudentModal;
