import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface HierarchicalInfo {
  hasHierarchy: boolean;
  parentField?: string;
  parentRelation?: string;
  childrenField?: string;
  modelName?: string;
}

/**
 * Servicio para detectar automáticamente relaciones padre-hijo en modelos de Prisma
 */
@Injectable()
export class HierarchicalDetectorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Detecta si un modelo tiene relaciones padre-hijo basándose en la estructura del schema
   */
  hasParentChildRelation(modelName: string): boolean {
    const info = this.getHierarchicalInfo(modelName);
    return info.hasHierarchy;
  }

  /**
   * Obtiene información completa sobre las relaciones jerárquicas de un modelo
   */
  getHierarchicalInfo(modelName: string): HierarchicalInfo {
    try {
      const dmmf = Prisma.dmmf;
      const model = dmmf.datamodel.models.find(
        (m: any) => m.name === modelName,
      );

      if (!model) {
        return { hasHierarchy: false };
      }

      // Buscar campo parentId o parent_id
      const parentField = model.fields.find(
        (field: any) => field.name === 'parentId' || field.name === 'parent_id',
      );

      // Buscar relación parent
      const parentRelation = model.fields.find(
        (field: any) => field.name === 'parent' && field.kind === 'object',
      );

      // Buscar relación hijos/children
      const childrenRelation = model.fields.find(
        (field: any) =>
          (field.name === 'hijos' || field.name === 'children') &&
          field.kind === 'object' &&
          field.isList,
      );

      const hasHierarchy = !!(
        parentField &&
        parentRelation &&
        childrenRelation
      );

      return {
        hasHierarchy,
        parentField: parentField?.name,
        parentRelation: parentRelation?.name,
        childrenField: childrenRelation?.name,
        modelName: model.name,
      };
    } catch (error) {
      console.error(
        `Error detecting hierarchical relation for ${modelName}:`,
        error,
      );
      return { hasHierarchy: false };
    }
  }

  /**
   * Obtiene todos los modelos que tienen relaciones padre-hijo
   */
  getHierarchicalModels(): string[] {
    try {
      const dmmf = Prisma.dmmf;
      return dmmf.datamodel.models
        .filter((model: any) => this.hasParentChildRelation(model.name))
        .map((model: any) => model.name);
    } catch (error) {
      console.error('Error getting hierarchical models:', error);
      return [];
    }
  }

  /**
   * Obtiene información jerárquica de todos los modelos
   */
  getAllHierarchicalInfo(): Record<string, HierarchicalInfo> {
    try {
      const dmmf = Prisma.dmmf;
      const result: Record<string, HierarchicalInfo> = {};

      dmmf.datamodel.models.forEach((model: any) => {
        const info = this.getHierarchicalInfo(model.name);
        if (info.hasHierarchy) {
          result[model.name] = info;
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting all hierarchical info:', error);
      return {};
    }
  }
}
