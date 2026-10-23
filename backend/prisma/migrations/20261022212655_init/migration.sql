-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ESTUDIANTE', 'ARRENDADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('INDIVIDUAL', 'COMPARTIDA', 'MINIDEPARTAMENTO', 'ESTUDIO');

-- CreateEnum
CREATE TYPE "BathroomType" AS ENUM ('PRIVADO', 'COMPARTIDO');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('DISPONIBLE', 'ALQUILADO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255),
    "fullName" VARCHAR(120) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ESTUDIANTE',
    "codigoPucp" VARCHAR(12),
    "facultad" VARCHAR(100),
    "dni" CHAR(8),
    "partidaRegistral" VARCHAR(30),
    "whatsapp" VARCHAR(20),
    "isReniecVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSunarpVerified" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutLevel" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "type" "RoomType" NOT NULL DEFAULT 'INDIVIDUAL',
    "district" VARCHAR(50) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "areaSqm" DOUBLE PRECISION NOT NULL,
    "bathroomType" "BathroomType" NOT NULL DEFAULT 'PRIVADO',
    "isFurnished" BOOLEAN NOT NULL DEFAULT true,
    "includesWater" BOOLEAN NOT NULL DEFAULT true,
    "includesElectricity" BOOLEAN NOT NULL DEFAULT true,
    "includesWifi" BOOLEAN NOT NULL DEFAULT true,
    "includedServices" TEXT[] DEFAULT ARRAY['Agua', 'Luz', 'WiFi']::TEXT[],
    "description" VARCHAR(300) NOT NULL,
    "photos" TEXT[],
    "distanceToPucpKm" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "walkingMinutesToPucp" INTEGER NOT NULL DEFAULT 12,
    "status" "RoomStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "message" VARCHAR(300),
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVO',
    "notes" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "recipientEmail" VARCHAR(150) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "eventType" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_codigoPucp_key" ON "User"("codigoPucp");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_partidaRegistral_key" ON "User"("partidaRegistral");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Room_district_status_idx" ON "Room"("district", "status");

-- CreateIndex
CREATE INDEX "Room_monthlyPrice_idx" ON "Room"("monthlyPrice");

-- CreateIndex
CREATE INDEX "Room_bathroomType_isFurnished_idx" ON "Room"("bathroomType", "isFurnished");

-- CreateIndex
CREATE INDEX "Room_distanceToPucpKm_idx" ON "Room"("distanceToPucpKm");

-- CreateIndex
CREATE INDEX "Room_landlordId_idx" ON "Room"("landlordId");

-- CreateIndex
CREATE INDEX "ContactRequest_studentId_roomId_createdAt_idx" ON "ContactRequest"("studentId", "roomId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_roomId_status_idx" ON "ContactRequest"("roomId", "status");

-- CreateIndex
CREATE INDEX "Contract_studentId_roomId_idx" ON "Contract"("studentId", "roomId");

-- CreateIndex
CREATE INDEX "Contract_landlordId_idx" ON "Contract"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_contractId_key" ON "Review"("contractId");

-- CreateIndex
CREATE INDEX "Review_landlordId_idx" ON "Review"("landlordId");

-- CreateIndex
CREATE INDEX "Review_roomId_idx" ON "Review"("roomId");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientEmail_idx" ON "NotificationLog"("recipientEmail");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones de Dominio (RFs) a nivel de Motor Relacional PostgreSQL
-- RF-1: Estudiantes se autentican exclusivamente con correo institucional @pucp.edu.pe
ALTER TABLE "User" ADD CONSTRAINT "User_student_email_pucp_check" CHECK ("role" <> 'ESTUDIANTE' OR "email" LIKE '%@pucp.edu.pe');

-- RF-2: DNI de 8 dígitos numéricos para validación RENIEC
ALTER TABLE "User" ADD CONSTRAINT "User_dni_format_check" CHECK ("dni" IS NULL OR "dni" ~ '^[0-9]{8}$');

-- RF-7: Descripción de habitación obligatoria entre 30 y 300 caracteres
ALTER TABLE "Room" ADD CONSTRAINT "Room_description_length_check" CHECK (CHAR_LENGTH("description") >= 30 AND CHAR_LENGTH("description") <= 300);

-- RF-7: Entre 3 y 10 fotografías por habitación
ALTER TABLE "Room" ADD CONSTRAINT "Room_photos_count_check" CHECK (ARRAY_LENGTH("photos", 1) >= 3 AND ARRAY_LENGTH("photos", 1) <= 10);

-- RF-7: Precio mensual y área en m² positivos
ALTER TABLE "Room" ADD CONSTRAINT "Room_positive_metrics_check" CHECK ("monthlyPrice" > 0 AND "areaSqm" > 0);

-- RF-23: Calificación entre 1 y 5 estrellas y comentario obligatorio (30 a 300 caracteres) si la puntuación es <= 2 estrellas
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range_check" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_comment_policy_check" CHECK (
  ("rating" > 2 AND ("comment" IS NULL OR (CHAR_LENGTH("comment") >= 30 AND CHAR_LENGTH("comment") <= 300)))
  OR
  ("rating" <= 2 AND "comment" IS NOT NULL AND CHAR_LENGTH("comment") >= 30 AND CHAR_LENGTH("comment") <= 300)
);

