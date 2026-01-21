import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ExtendedPrismaClient } from './prisma.extensions';

// Definimos la clase abstracta para usarla como Token de inyección
export abstract class PrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {}
  async onModuleDestroy() {}
}

// Fusionamos la interfaz para que TS sepa que PrismaService tiene los métodos del cliente extendido

export interface PrismaService extends ExtendedPrismaClient {}
