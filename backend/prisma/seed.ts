import 'dotenv/config';
import {
  PrismaClient,
  Role,
  RoomType,
  BathroomType,
  RoomStatus,
  ContactRequestStatus,
  ContractStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos FindRoom...');

  // Limpiar registros previos en orden inverso de dependencias
  await prisma.notificationLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // 1. Crear Usuarios: Admin, 3 Arrendadores Ficticios Verificados (RENIEC + SUNARP) y 3 Estudiantes PUCP
  const admin = await prisma.user.create({
    data: {
      email: 'admin.soporte@findroom-demo.pe',
      passwordHash: '$2b$10$MockHashedPasswordAdminFindRoom2026',
      fullName: 'Admin Institucional FindRoom',
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  const landlordCarlos = await prisma.user.create({
    data: {
      email: 'carmen.mendoza@findroom-demo.pe',
      passwordHash: '$2b$10$MockHashedPasswordCarlos2026',
      fullName: 'Carmen Mendoza',
      role: Role.ARRENDADOR,
      dni: '41829304',
      partidaRegistral: 'PR-11048291',
      whatsapp: '+51 987 654 321',
      isReniecVerified: true,
      isSunarpVerified: true,
      isVerified: true,
      averageRating: 4.8,
      totalReviews: 2,
    },
  });

  const landlordElena = await prisma.user.create({
    data: {
      id: '22222222-2222-4222-8222-222222222201',
      email: 'elena.vargas@findroom-demo.pe',
      passwordHash: '$2b$10$MockHashedPasswordElena2026',
      fullName: 'Elena Vargas',
      role: Role.ARRENDADOR,
      dni: '43910285',
      partidaRegistral: '11294850',
      whatsapp: '+51 987 654 321',
      isReniecVerified: true,
      isSunarpVerified: true,
      isVerified: true,
      averageRating: 5.0,
      totalReviews: 1,
    },
  });

  const landlordJorge = await prisma.user.create({
    data: {
      id: '22222222-2222-4222-8222-222222222202',
      email: 'jorge.alarcon@findroom-demo.pe',
      passwordHash: '$2b$10$MockHashedPasswordJorge2026',
      fullName: 'Jorge Alarcón',
      role: Role.ARRENDADOR,
      dni: '40592817',
      partidaRegistral: 'PR-11839204',
      whatsapp: '+51 987 654 321',
      isReniecVerified: true,
      isSunarpVerified: true,
      isVerified: true,
      averageRating: 4.5,
      totalReviews: 1,
    },
  });

  const studentMateo = await prisma.user.create({
    data: {
      id: '11111111-1111-4111-8111-111111111101',
      email: 'mateo.salazar@pucp.edu.pe',
      fullName: 'Mateo Salazar',
      role: Role.ESTUDIANTE,
      codigoPucp: '20210842',
      facultad: 'Ciencias e Ingeniería',
      isVerified: true,
    },
  });

  const studentValeria = await prisma.user.create({
    data: {
      email: 'valeria.quispe@pucp.edu.pe',
      fullName: 'Valeria Quispe',
      role: Role.ESTUDIANTE,
      codigoPucp: '20230891',
      facultad: 'Arquitectura y Urbanismo',
      isVerified: true,
    },
  });

  const studentSebastian = await prisma.user.create({
    data: {
      email: 'sebastian.rojas@pucp.edu.pe',
      fullName: 'Sebastián Rojas',
      role: Role.ESTUDIANTE,
      codigoPucp: '20214512',
      facultad: 'Gestión y Alta Dirección',
      isVerified: true,
    },
  });

  // 2. Crear 6 Habitaciones Realistas en San Miguel y Pueblo Libre (RF-7: descripción 30-300 chars, 3-10 fotos Unsplash)
  const room1 = await prisma.room.create({
    data: {
      landlordId: landlordCarlos.id,
      title: 'Habitación Ejecutiva Frente a Puerta Principal PUCP',
      type: RoomType.INDIVIDUAL,
      district: 'San Miguel',
      address: 'Av. Universitaria 1940, Dpto. 402, San Miguel',
      monthlyPrice: 850,
      areaSqm: 16,
      bathroomType: BathroomType.PRIVADO,
      isFurnished: true,
      includesWater: true,
      includesElectricity: true,
      includesWifi: true,
      includedServices: ['Agua', 'Luz', 'WiFi'],
      description:
        'Habitación iluminada a solo 4 minutos caminando de la puerta principal PUCP. Cuenta con escritorio ergonómico, clóset empotrado, cama de plaza y media e internet fibra óptica de 600 Mbps ideal para clases.',
      photos: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 0.35,
      walkingMinutesToPucp: 4,
      status: RoomStatus.DISPONIBLE,
    },
  });

  const room2 = await prisma.room.create({
    data: {
      landlordId: landlordCarlos.id,
      title: 'Estudio Independiente con Vista a Parque Pando',
      type: RoomType.ESTUDIO,
      district: 'San Miguel',
      address: 'Calle Parque José de Acosta 145, Urb. Pando, San Miguel',
      monthlyPrice: 980,
      areaSqm: 22,
      bathroomType: BathroomType.PRIVADO,
      isFurnished: true,
      includesWater: true,
      includesElectricity: true,
      includesWifi: true,
      includedServices: ['Agua', 'Luz', 'WiFi'],
      description:
        'Estudio silencioso con ingreso independiente en zona residencial segura con serenazgo permanente. Incluye kitchenette equipada, baño privado con terma eléctrica y escritorio amplio frente a ventana.',
      photos: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 0.55,
      walkingMinutesToPucp: 7,
      status: RoomStatus.DISPONIBLE,
    },
  });

  const room3 = await prisma.room.create({
    data: {
      landlordId: landlordElena.id,
      title: 'Habitación Económica cerca a Plaza San Miguel',
      type: RoomType.INDIVIDUAL,
      district: 'San Miguel',
      address: 'Av. La Mar 2215, Interior B, San Miguel',
      monthlyPrice: 650,
      areaSqm: 13,
      bathroomType: BathroomType.COMPARTIDO,
      isFurnished: true,
      includesWater: true,
      includesElectricity: false,
      includesWifi: true,
      includedServices: ['Agua', 'WiFi'],
      description:
        'Ambiente acogedor y ventilado a dos cuadras de Plaza San Miguel y a 10 minutos del campus PUCP. Áreas comunes limpias, cocina compartida equipada, lavandería y ambiente exclusivo de estudio.',
      photos: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 0.85,
      walkingMinutesToPucp: 10,
      status: RoomStatus.DISPONIBLE,
    },
  });

  const room4 = await prisma.room.create({
    data: {
      landlordId: landlordElena.id,
      title: 'Minidepartamento Moderno en Av. Bolívar',
      type: RoomType.MINIDEPARTAMENTO,
      district: 'Pueblo Libre',
      address: 'Av. Bolívar 1420, Dpto. 301, Pueblo Libre',
      monthlyPrice: 1150,
      areaSqm: 28,
      bathroomType: BathroomType.PRIVADO,
      isFurnished: true,
      includesWater: true,
      includesElectricity: true,
      includesWifi: true,
      includedServices: ['Agua', 'Luz', 'WiFi'],
      description:
        'Minidepartamento recién remodelado en Pueblo Libre a 8 minutos de la PUCP. Cuenta con sala de estudio integrada, dormitorio independiente, baño privado con acabados en cuarzo y vigilancia 24/7.',
      photos: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 0.7,
      walkingMinutesToPucp: 8,
      status: RoomStatus.DISPONIBLE,
    },
  });

  const room5 = await prisma.room.create({
    data: {
      landlordId: landlordJorge.id,
      title: 'Habitación Tranquila en Zona Histórica de Pueblo Libre',
      type: RoomType.INDIVIDUAL,
      district: 'Pueblo Libre',
      address: 'Calle Carlos de los Heros 280, Pueblo Libre',
      monthlyPrice: 720,
      areaSqm: 15,
      bathroomType: BathroomType.PRIVADO,
      isFurnished: false,
      includesWater: true,
      includesElectricity: true,
      includesWifi: true,
      includedServices: ['Agua', 'Luz', 'WiFi'],
      description:
        'Habitación amplia sin amoblar en casa familiar tranquila de Pueblo Libre, ideal para personalizar tu espacio de estudio. Incluye baño privado completo, todos los servicios y acceso a jardín interior.',
      photos: [
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 1.15,
      walkingMinutesToPucp: 14,
      status: RoomStatus.DISPONIBLE,
    },
  });

  const room6 = await prisma.room.create({
    data: {
      landlordId: landlordJorge.id,
      title: 'Habitación Doble Luminosa en Jr. Mariano Cornejo',
      type: RoomType.COMPARTIDA,
      district: 'Pueblo Libre',
      address: 'Jr. Mariano Cornejo 1850, Dpto. 202, Pueblo Libre',
      monthlyPrice: 600,
      areaSqm: 18,
      bathroomType: BathroomType.COMPARTIDO,
      isFurnished: true,
      includesWater: true,
      includesElectricity: true,
      includesWifi: true,
      includedServices: ['Agua', 'Luz', 'WiFi'],
      description:
        'Habitación compartida equipada con dos escritorios independientes, estanterías individuales y excelente iluminación natural. Ubicada frente a ciclovía directa hacia el campus universitario PUCP.',
      photos: [
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80',
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1400&q=80',
      ],
      distanceToPucpKm: 0.9,
      walkingMinutesToPucp: 11,
      status: RoomStatus.DISPONIBLE,
    },
  });

  // 3. Crear Solicitudes de Contacto Preexistentes (RF-8, RF-15, RF-16)
  // Solicitud ACEPTADA: Mateo puede ver el WhatsApp de Carmen Mendoza en room1
  await prisma.contactRequest.create({
    data: {
      studentId: studentMateo.id,
      roomId: room1.id,
      message:
        'Hola Carmen Mendoza, soy estudiante de Ingeniería Informática en la PUCP y me interesa visitar la habitación esta semana.',
      status: ContactRequestStatus.ACEPTADA,
      respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  // Solicitud PENDIENTE: Valeria solicitó contacto en room2 (WhatsApp oculto hasta aceptación manual - RF-15)
  await prisma.contactRequest.create({
    data: {
      studentId: studentValeria.id,
      roomId: room2.id,
      message:
        'Hola Carmen Mendoza, estudio Arquitectura en la PUCP y busco un estudio tranquilo cerca al campus para este ciclo.',
      status: ContactRequestStatus.PENDIENTE,
    },
  });

  // Solicitud PENDIENTE: Mateo solicitó contacto en room3 de Elena Vargas
  await prisma.contactRequest.create({
    data: {
      studentId: studentMateo.id,
      roomId: room3.id,
      message:
        'Hola Elena Vargas, soy Mateo Salazar y me gustaría visitar la habitación cerca a Plaza San Miguel.',
      status: ContactRequestStatus.PENDIENTE,
    },
  });

  // Solicitud PENDIENTE: Sebastián solicitó contacto en room4 de Elena Vargas
  await prisma.contactRequest.create({
    data: {
      studentId: studentSebastian.id,
      roomId: room4.id,
      message:
        'Buenas tardes Elena Vargas, quisiera consultar disponibilidad para mudarme a inicios del próximo mes.',
      status: ContactRequestStatus.PENDIENTE,
    },
  });

  // Solicitud ACEPTADA: Valeria en room4
  await prisma.contactRequest.create({
    data: {
      studentId: studentValeria.id,
      roomId: room4.id,
      message:
        'Hola Elena Vargas, me encantaría coordinar una visita al minidepartamento de la Av. Bolívar.',
      status: ContactRequestStatus.ACEPTADA,
      respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  });

  // Solicitud RECHAZADA: Sebastián en room5
  await prisma.contactRequest.create({
    data: {
      studentId: studentSebastian.id,
      roomId: room5.id,
      message: 'Hola Jorge Alarcón, ¿la habitación cuenta con cochera para bicicleta?',
      status: ContactRequestStatus.RECHAZADA,
      respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    },
  });

  // 4. Crear Contratos Previos y Reseñas Verificadas (RF-23, RF-24)
  const contract1 = await prisma.contract.create({
    data: {
      roomId: room1.id,
      studentId: studentMateo.id,
      landlordId: landlordCarlos.id,
      startDate: new Date('2026-03-15T00:00:00.000Z'),
      endDate: new Date('2026-07-31T00:00:00.000Z'),
      monthlyRent: 850,
      status: ContractStatus.FINALIZADO,
      notes: 'Contrato semestral ciclo 2026-I cumplido satisfactoriamente.',
    },
  });

  const contract2 = await prisma.contract.create({
    data: {
      roomId: room2.id,
      studentId: studentSebastian.id,
      landlordId: landlordCarlos.id,
      startDate: new Date('2026-03-15T00:00:00.000Z'),
      endDate: new Date('2026-07-31T00:00:00.000Z'),
      monthlyRent: 980,
      status: ContractStatus.FINALIZADO,
      notes: 'Contrato semestral ciclo 2026-I finalizado sin incidencias.',
    },
  });

  const contract3 = await prisma.contract.create({
    data: {
      roomId: room4.id,
      studentId: studentValeria.id,
      landlordId: landlordElena.id,
      startDate: new Date('2026-03-10T00:00:00.000Z'),
      endDate: new Date('2026-07-30T00:00:00.000Z'),
      monthlyRent: 1150,
      status: ContractStatus.FINALIZADO,
      notes: 'Contrato semestral 2026-I en Pueblo Libre.',
    },
  });

  const contract4 = await prisma.contract.create({
    data: {
      roomId: room6.id,
      studentId: studentMateo.id,
      landlordId: landlordJorge.id,
      startDate: new Date('2025-08-15T00:00:00.000Z'),
      endDate: new Date('2025-12-20T00:00:00.000Z'),
      monthlyRent: 600,
      status: ContractStatus.FINALIZADO,
      notes: 'Contrato semestral 2025-II.',
    },
  });

  // Contrato previo adicional de Mateo Salazar con Elena Vargas (listo para calificar en ReviewModal)
  await prisma.contract.create({
    data: {
      roomId: room4.id,
      studentId: studentMateo.id,
      landlordId: landlordElena.id,
      startDate: new Date('2025-03-15T00:00:00.000Z'),
      endDate: new Date('2025-07-25T00:00:00.000Z'),
      monthlyRent: 1150,
      status: ContractStatus.FINALIZADO,
      notes: 'Contrato semestral 2025-I con Elena Vargas.',
    },
  });

  await prisma.review.createMany({
    data: [
      {
        contractId: contract1.id,
        roomId: room1.id,
        studentId: studentMateo.id,
        landlordId: landlordCarlos.id,
        rating: 5,
        comment:
          'Excelente habitación a pocos pasos de la PUCP. Carmen Mendoza es muy respetuosa y el internet funcionó perfecto todo el ciclo.',
      },
      {
        contractId: contract2.id,
        roomId: room2.id,
        studentId: studentSebastian.id,
        landlordId: landlordCarlos.id,
        rating: 5,
        comment:
          'Zona muy segura frente al parque en Urb. Pando. El estudio es exactamente como en las fotos y súper silencioso para estudiar en exámenes.',
      },
      {
        contractId: contract3.id,
        roomId: room4.id,
        studentId: studentValeria.id,
        landlordId: landlordElena.id,
        rating: 5,
        comment:
          'Elena Vargas mantiene el edificio impecable. El minidepartamento en Av. Bolívar tiene mucha luz natural y seguridad todo el día.',
      },
      {
        contractId: contract4.id,
        roomId: room6.id,
        studentId: studentMateo.id,
        landlordId: landlordJorge.id,
        rating: 4,
        comment:
          'Buena relación calidad-precio en Pueblo Libre y muy cerca de la ciclovía hacia la universidad. Ambiente tranquilo y servicios puntuales.',
      },
    ],
  });

  // Recalcular promedios reales de cada arrendador según RF-24
  for (const landlord of [landlordCarlos, landlordElena, landlordJorge]) {
    const agg = await prisma.review.aggregate({
      where: { landlordId: landlord.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.user.update({
      where: { id: landlord.id },
      data: {
        averageRating: Number((agg._avg.rating ?? 0).toFixed(2)),
        totalReviews: agg._count.rating,
      },
    });
  }

  // Registro inicial en NotificationLog para evidencia del adaptador mock
  await prisma.notificationLog.create({
    data: {
      recipientEmail: studentMateo.email,
      subject: 'Solicitud de contacto aceptada - FindRoom PUCP',
      message:
        'La propietaria Carmen Mendoza ha aceptado tu solicitud para "Habitación Ejecutiva Frente a Puerta Principal PUCP". Ya puedes visualizar su número de WhatsApp.',
      eventType: 'CONTACT_REQUEST_ACCEPTED',
    },
  });

  console.log('✅ Seed completado exitosamente:');
  console.log(`   - Usuarios creados: 1 Admin, 3 Arrendadores verificados, 3 Estudiantes PUCP`);
  console.log(`   - Habitaciones creadas: 6 (3 en San Miguel, 3 en Pueblo Libre)`);
  console.log(`   - Solicitudes de contacto preexistentes: 5`);
  console.log(`   - Contratos y reseñas históricas: 4`);
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
