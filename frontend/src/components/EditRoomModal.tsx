import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bath,
  CheckCircle2,
  Droplets,
  ImagePlus,
  Save,
  Sofa,
  Trash2,
  UploadCloud,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { roomService } from '../services/api';
import { BathroomType, RoomItem } from '../types/room';

interface EditRoomModalProps {
  isOpen: boolean;
  room: RoomItem | null;
  landlordId?: string;
  onClose: () => void;
  onRoomUpdated: (updatedRoom: RoomItem) => void;
}

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  isOpen,
  room,
  onClose,
  onRoomUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState<string>(room?.title ?? '');
  const [district, setDistrict] = useState<string>(room?.district ?? 'San Miguel');
  const [address, setAddress] = useState<string>(room?.address ?? '');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(room?.monthlyPrice ?? 850);
  const [areaSqm, setAreaSqm] = useState<number>(room?.areaSqm ?? 16);
  const [bathroomType, setBathroomType] = useState<BathroomType>(
    room?.bathroomType ?? 'PRIVADO'
  );
  const [isFurnished, setIsFurnished] = useState<boolean>(room?.isFurnished ?? true);
  const [includesWater, setIncludesWater] = useState<boolean>(
    room?.includesWater ?? true
  );
  const [includesElectricity, setIncludesElectricity] = useState<boolean>(
    room?.includesElectricity ?? true
  );
  const [includesWifi, setIncludesWifi] = useState<boolean>(room?.includesWifi ?? true);
  const [description, setDescription] = useState<string>(room?.description ?? '');
  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  React.useEffect(() => {
    if (room) {
      setTitle(room.title ?? '');
      setDistrict(room.district ?? 'San Miguel');
      setAddress(room.address ?? '');
      setMonthlyPrice(room.monthlyPrice ?? 850);
      setAreaSqm(room.areaSqm ?? 16);
      setBathroomType(room.bathroomType ?? 'PRIVADO');
      setIsFurnished(room.isFurnished ?? true);
      setIncludesWater(room.includesWater ?? true);
      setIncludesElectricity(room.includesElectricity ?? true);
      setIncludesWifi(room.includesWifi ?? true);
      setDescription(room.description ?? '');
      setPhotos(room.photos ?? []);
    }
  }, [room]);

  if (!isOpen || !room) return null;

  const trimmedDesc = description.trim();
  const charCount = trimmedDesc.length;
  const isDescValid = charCount >= 30 && charCount <= 300;
  const isFormValid =
    title.trim().length > 3 &&
    monthlyPrice > 0 &&
    areaSqm > 0 &&
    isDescValid &&
    photos.length >= 1;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`El archivo "${file.name}" no es una imagen válida.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => {
            if (prev.length >= 10) {
              toast.warning('Máximo 10 fotografías por publicación.');
              return prev;
            }
            return [...prev, reader.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (photos.length <= 1) {
      toast.warning('La publicación debe conservar al menos una fotografía.');
      return;
    }
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSaving(true);
    try {
      const includedServices = [
        ...(includesWater ? ['Agua'] : []),
        ...(includesElectricity ? ['Luz'] : []),
        ...(includesWifi ? ['WiFi'] : []),
      ];

      const updated = await roomService.updateRoom(room.id, {
        title: title.trim(),
        district,
        address: address.trim(),
        monthlyPrice: Number(monthlyPrice),
        areaSqm: Number(areaSqm),
        bathroomType,
        isFurnished,
        includesWater,
        includesElectricity,
        includesWifi,
        includedServices,
        description: trimmedDesc,
        photos,
      });

      toast.success('Habitación actualizada correctamente');
      onRoomUpdated(updated);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios.'
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-room-modal-title"
      className="fixed inset-0 top-0 left-0 w-screen h-screen m-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md overflow-y-auto"
      style={{
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="edit-room-modal-title"
              className="text-base font-bold text-[#0F2042]"
            >
              Editar Habitación
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Actualiza precio mensual, amenidades, descripción o fotografías.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Título y Distrito */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Título del anuncio
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Distrito
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="San Miguel">San Miguel</option>
                <option value="Pueblo Libre">Pueblo Libre</option>
                <option value="Jesús María">Jesús María</option>
                <option value="Magdalena">Magdalena</option>
                <option value="Cercado">Cercado</option>
              </select>
            </div>
          </div>

          {/* Dirección, Precio mensual y Área */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Dirección
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Precio mensual (S/)
              </label>
              <input
                type="number"
                min={250}
                required
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm font-semibold tabular-nums text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F2042] mb-1">
                Área (m²)
              </label>
              <input
                type="number"
                min={6}
                required
                value={areaSqm}
                onChange={(e) => setAreaSqm(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm tabular-nums text-[#0F2042] focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          {/* Amenidades y Servicios */}
          <div>
            <span className="block text-xs font-semibold text-[#0F2042] mb-2">
              Amenidades y servicios incluidos
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setBathroomType((prev) =>
                    prev === 'PRIVADO' ? 'COMPARTIDO' : 'PRIVADO'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  bathroomType === 'PRIVADO'
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-[#F8F9FA] text-slate-700 border-slate-200'
                }`}
              >
                <Bath className="w-3.5 h-3.5" />
                <span>
                  {bathroomType === 'PRIVADO' ? 'Baño privado' : 'Baño compartido'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsFurnished((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  isFurnished
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-[#F8F9FA] text-slate-700 border-slate-200'
                }`}
              >
                <Sofa className="w-3.5 h-3.5" />
                <span>{isFurnished ? 'Amoblado' : 'Sin amoblar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludesWater((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  includesWater
                    ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                    : 'bg-[#F8F9FA] text-slate-500 border-slate-200'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Agua</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludesElectricity((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  includesElectricity
                    ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                    : 'bg-[#F8F9FA] text-slate-500 border-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Luz</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludesWifi((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  includesWifi
                    ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                    : 'bg-[#F8F9FA] text-slate-500 border-slate-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>WiFi</span>
              </button>
            </div>
          </div>

          {/* Descripción con contador en tiempo real (30 a 300 caracteres) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#0F2042]">
                Descripción de la habitación (30 a 300 caracteres)
              </label>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  isDescValid ? 'text-[#059669]' : 'text-[#DC2626]'
                }`}
              >
                {charCount} / 300 caracteres
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full rounded-md bg-[#F8F9FA] border p-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none ${
                isDescValid
                  ? 'border-slate-200 focus:border-[#1D4ED8]'
                  : 'border-[#DC2626] focus:border-[#DC2626]'
              }`}
            />
            <div className="mt-1 text-[11px]">
              {!isDescValid ? (
                <span className="text-[#DC2626] font-medium">
                  La descripción debe contener entre 30 y 300 caracteres (faltan{' '}
                  {Math.max(0, 30 - charCount)}).
                </span>
              ) : (
                <span className="text-[#059669] font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Longitud de descripción válida
                </span>
              )}
            </div>
          </div>

          {/* Zona simulada de carga de imágenes (Drag & Drop / Input file) con miniaturas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#0F2042]">
                Fotografías de la propiedad ({photos.length} / 10)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Subir desde mi equipo</span>
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#1D4ED8] bg-blue-50/50'
                  : 'border-slate-200 bg-[#F8F9FA] hover:border-slate-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <UploadCloud className="w-6 h-6 text-[#1D4ED8] mx-auto" />
              <p className="mt-1 text-xs font-medium text-[#0F2042]">
                Arrastra tus fotos aquí o haz clic para seleccionar archivos locales
              </p>
              <p className="text-[11px] text-slate-400">
                JPG, PNG o WebP en alta resolución
              </p>
            </div>

            {/* Cuadrícula de miniaturas (thumbnails) con botón para eliminarlas */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-3">
                {photos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={photoUrl}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(idx);
                      }}
                      title="Eliminar fotografía"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center opacity-90 hover:bg-[#DC2626] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isFormValid || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1D4ED8] text-white text-xs font-bold hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditRoomModal;
