import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { roomService } from '../services/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle: string;
  landlordName: string;
  studentId: string;
  onReviewSubmitted: () => void;
}

const REASON_CHIPS = [
  'Zona tranquila',
  'Puntualidad en servicios',
  'Cercanía al campus PUCP',
  'Trato respetuoso',
  'Internet estable para clases',
  'Áreas comunes limpias',
  'Ruidos molestos',
  'Demora en mantenimiento',
];

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: '1 estrella — Muy deficiente (comentario obligatorio)', color: 'text-[#DC2626]' },
  2: { text: '2 estrellas — Insatisfactorio (comentario obligatorio)', color: 'text-[#DC2626]' },
  3: { text: '3 estrellas — Regular', color: 'text-amber-700' },
  4: { text: '4 estrellas — Muy buena experiencia', color: 'text-[#059669]' },
  5: { text: '5 estrellas — Excelente experiencia', color: 'text-[#059669]' },
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  landlordName,
  studentId,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const displayedRating = hoveredRating ?? rating;
  const trimmedComment = comment.trim();
  const charCount = trimmedComment.length;

  const isLowRating = rating <= 2;
  const isLengthValid = charCount >= 30 && charCount <= 300;
  const isSubmitBlocked =
    submitting ||
    (isLowRating && !isLengthValid) ||
    (!isLowRating && charCount > 0 && !isLengthValid);

  const handleToggleChip = (chip: string) => {
    const isAlreadySelected = selectedChips.includes(chip);
    const nextChips = isAlreadySelected
      ? selectedChips.filter((c) => c !== chip)
      : [...selectedChips, chip];

    setSelectedChips(nextChips);

    if (!isAlreadySelected && !comment.toLowerCase().includes(chip.toLowerCase())) {
      const prefix = comment.trim().length > 0 ? `${comment.trim()} ` : '';
      const candidate = `${prefix}Destaco: ${chip.toLowerCase()}.`;
      if (candidate.length <= 300) {
        setComment(candidate);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitBlocked) return;

    setSubmitting(true);
    try {
      const response = await roomService.createReview({
        studentId,
        roomId,
        rating,
        comment: trimmedComment.length > 0 ? trimmedComment : undefined,
      });

      toast.success('Calificación publicada', {
        description: `Nuevo promedio de ${landlordName}: ${response.landlordRating.averageRating.toFixed(1)} / 5.0`,
      });

      onReviewSubmitted();
      onClose();
    } catch (error) {
      toast.error('No se pudo publicar la calificación', {
        description:
          error instanceof Error
            ? error.message
            : 'Se requiere haber alquilado previamente esta habitación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 top-0 left-0 w-screen h-screen m-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md overflow-y-auto"
      style={{
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0F2042] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="review-modal-title" className="text-base font-bold">
              Calificar experiencia de alquiler
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{roomTitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Estrellas interactivas */}
          <div className="text-center space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">
              Puntuación para {landlordName}
            </label>
            <div className="inline-flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= displayedRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(null)}
                    onClick={() => setRating(starValue)}
                    className="p-1 rounded-md hover:bg-slate-100 transition-transform active:scale-95 focus:outline-none"
                    aria-label={`Calificar con ${starValue} estrellas`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? starValue <= 2 && displayedRating <= 2
                            ? 'fill-[#DC2626] text-[#DC2626]'
                            : 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className={`text-xs font-semibold ${RATING_LABELS[displayedRating].color}`}>
              {RATING_LABELS[displayedRating].text}
            </div>
          </div>

          {/* Chips de motivos */}
          <div>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
              Motivos frecuentes
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REASON_CHIPS.map((chip) => {
                const active = selectedChips.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleToggleChip(chip)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                        : 'bg-[#F8F9FA] text-slate-700 border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {isLowRating && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Para calificaciones de 1 o 2 estrellas es obligatorio escribir un comentario de entre 30 y 300 caracteres.
              </span>
            </div>
          )}

          {/* Área de texto con contador 30 a 300 caracteres */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="review-comment-textarea"
                className="text-xs font-semibold text-[#0F2042]"
              >
                Comentario {isLowRating && <span className="text-[#DC2626]">*</span>}
              </label>

              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  charCount === 0 && !isLowRating
                    ? 'text-slate-400'
                    : isLengthValid
                    ? 'text-[#059669]'
                    : 'text-[#DC2626]'
                }`}
              >
                {charCount} / 300
              </span>
            </div>

            <textarea
              id="review-comment-textarea"
              rows={4}
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe tu experiencia (entre 30 y 300 caracteres)..."
              className={`w-full rounded-md bg-[#F8F9FA] border p-3 text-xs sm:text-sm text-slate-800 focus:outline-none ${
                (isLowRating && !isLengthValid) || (!isLowRating && charCount > 0 && !isLengthValid)
                  ? 'border-[#DC2626] focus:border-[#DC2626]'
                  : 'border-[#E2E8F0] focus:border-[#1D4ED8]'
              }`}
            />

            <div className="mt-1 text-[11px]">
              {charCount > 0 && charCount < 30 ? (
                <span className="text-[#DC2626] font-medium tabular-nums">
                  Faltan {30 - charCount} caracteres para el mínimo requerido (30).
                </span>
              ) : isLowRating && charCount === 0 ? (
                <span className="text-[#DC2626] font-medium">
                  Mínimo 30 caracteres requeridos.
                </span>
              ) : isLengthValid ? (
                <span className="text-[#059669] font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Longitud válida
                </span>
              ) : null}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitBlocked}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1D4ED8] text-white text-xs font-bold hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Enviando...' : 'Enviar calificación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ReviewModal;
