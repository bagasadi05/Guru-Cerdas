/**
 * Extracurricular Module
 * 
 * This module contains components, hooks, and types for managing
 * extracurricular activities including:
 * - List of extracurriculars
 * - Student enrollment
 * - Attendance tracking
 * - Grade management
 */

// Types
export * from './types';

// Hooks
export { useExtracurricularData, normalizeClassName } from './useExtracurricularData';
export { useExtracurricularMutations } from './useExtracurricularMutations';
