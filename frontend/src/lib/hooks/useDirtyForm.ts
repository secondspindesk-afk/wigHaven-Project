import { useState, useCallback, useRef, useMemo } from 'react';

/**
 * Deep equality check for comparing objects/arrays
 */
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => deepEqual(item, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a as object);
        const bKeys = Object.keys(b as object);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every(key =>
            deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        );
    }

    return false;
}

/**
 * Get only the fields that have changed between original and current
 */
function getDiff<T extends Record<string, unknown>>(original: T, current: T): Partial<T> {
    const diff: Partial<T> = {};

    for (const key of Object.keys(current) as Array<keyof T>) {
        if (!deepEqual(original[key], current[key])) {
            diff[key] = current[key];
        }
    }

    return diff;
}

/**
 * Get the list of field names that have changed
 */
function getChangedFieldNames<T extends Record<string, unknown>>(original: T, current: T): string[] {
    const changed: string[] = [];

    for (const key of Object.keys(current)) {
        if (!deepEqual(original[key as keyof T], current[key as keyof T])) {
            changed.push(key);
        }
    }

    return changed;
}

export interface DirtyFormResult<T extends Record<string, unknown>> {
    /** Current form data */
    formData: T;
    /** Original data (for reference) */
    originalData: T;
    /** Set a single field value */
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
    /** Set multiple fields at once */
    setFields: (updates: Partial<T>) => void;
    /** Replace entire form data (e.g., when loading from API) */
    setFormData: React.Dispatch<React.SetStateAction<T>>;
    /** Get only the fields that have changed */
    getDirtyFields: () => Partial<T>;
    /** Get the names of changed fields */
    getChangedFieldNames: () => string[];
    /** Check if any field has changed */
    hasChanges: () => boolean;
    /** Check if a specific field has changed */
    isFieldDirty: (field: keyof T) => boolean;
    /** Reset to original data */
    reset: () => void;
    /** Reset and set new original data (after successful save) */
    resetWithData: (newOriginal: T) => void;
    /** Get payload for API (includes _changedFields directive) */
    getUpdatePayload: () => Partial<T> & { _changedFields: string[] };
}

/**
 * Hook for tracking dirty (changed) fields in a form
 * 
 * @example
 * ```tsx
 * const { formData, setField, getUpdatePayload, hasChanges } = useDirtyForm(product);
 * 
 * // On input change:
 * <input value={formData.name} onChange={e => setField('name', e.target.value)} />
 * 
 * // On save:
 * if (hasChanges()) {
 *   await updateProduct(id, getUpdatePayload());
 * }
 * ```
 */
export function useDirtyForm<T extends Record<string, unknown>>(initialData: T): DirtyFormResult<T> {
    const [formData, setFormData] = useState<T>(initialData);
    const originalDataRef = useRef<T>(initialData);

    // Update original when initial data changes (e.g., from API refetch)
    const resetWithData = useCallback((newOriginal: T) => {
        originalDataRef.current = newOriginal;
        setFormData(newOriginal);
    }, []);

    // Set a single field
    const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Set multiple fields at once
    const setFields = useCallback((updates: Partial<T>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    // Get only changed fields
    const getDirtyFieldsCallback = useCallback(() => {
        return getDiff(originalDataRef.current, formData);
    }, [formData]);

    // Get changed field names
    const getChangedFieldNamesCallback = useCallback(() => {
        return getChangedFieldNames(originalDataRef.current, formData);
    }, [formData]);

    // Check if any changes exist
    const hasChanges = useCallback(() => {
        return !deepEqual(originalDataRef.current, formData);
    }, [formData]);

    // Check if specific field is dirty
    const isFieldDirty = useCallback((field: keyof T) => {
        return !deepEqual(originalDataRef.current[field], formData[field]);
    }, [formData]);

    // Reset to original
    const reset = useCallback(() => {
        setFormData(originalDataRef.current);
    }, []);

    // Get payload with _changedFields directive for backend
    const getUpdatePayload = useCallback(() => {
        const dirtyFields = getDiff(originalDataRef.current, formData);
        const changedNames = getChangedFieldNames(originalDataRef.current, formData);
        return {
            ...dirtyFields,
            _changedFields: changedNames
        };
    }, [formData]);

    // Memoized original data for external reference
    const originalData = useMemo(() => originalDataRef.current, []);

    return {
        formData,
        originalData,
        setField,
        setFields,
        setFormData,
        getDirtyFields: getDirtyFieldsCallback,
        getChangedFieldNames: getChangedFieldNamesCallback,
        hasChanges,
        isFieldDirty,
        reset,
        resetWithData,
        getUpdatePayload
    };
}

/**
 * Variant-aware dirty form hook for product forms
 * Tracks changes at both product and variant level
 */
export interface VariantDirtyFormResult<T extends Record<string, unknown>> extends DirtyFormResult<T> {
    /** Get changed variants only (with their IDs) */
    getDirtyVariants: () => Array<{ id?: string; _changedFields: string[] } & Record<string, unknown>>;
    /** Check if a specific variant has changes */
    isVariantDirty: (variantIndex: number) => boolean;
    /** Get variant-level changed field names */
    getVariantChangedFields: (variantIndex: number) => string[];
}

export function useDirtyFormWithVariants<T extends Record<string, unknown> & { variants?: unknown[] }>(
    initialData: T
): VariantDirtyFormResult<T> {
    const baseResult = useDirtyForm(initialData);

    const getDirtyVariants = useCallback(() => {
        const originalVariants = (baseResult.originalData as T).variants || [];
        const currentVariants = baseResult.formData.variants || [];

        const dirtyVariants: Array<{ id?: string; _changedFields: string[] } & Record<string, unknown>> = [];

        for (let i = 0; i < currentVariants.length; i++) {
            const current = currentVariants[i] as Record<string, unknown>;
            const original = originalVariants[i] as Record<string, unknown> | undefined;

            // New variant (no original)
            if (!original) {
                dirtyVariants.push({
                    ...current,
                    _changedFields: Object.keys(current).filter(k => k !== 'id')
                });
                continue;
            }

            // Existing variant - check for changes
            const changedFields = getChangedFieldNames(original, current);
            if (changedFields.length > 0) {
                const variantDiff = getDiff(original, current);
                dirtyVariants.push({
                    id: current.id as string | undefined,
                    ...variantDiff,
                    _changedFields: changedFields
                });
            }
        }

        return dirtyVariants;
    }, [baseResult.formData, baseResult.originalData]);

    const isVariantDirty = useCallback((variantIndex: number) => {
        const originalVariants = (baseResult.originalData as T).variants || [];
        const currentVariants = baseResult.formData.variants || [];

        const original = originalVariants[variantIndex] as Record<string, unknown> | undefined;
        const current = currentVariants[variantIndex] as Record<string, unknown> | undefined;

        if (!current) return false;
        if (!original) return true; // New variant

        return !deepEqual(original, current);
    }, [baseResult.formData, baseResult.originalData]);

    const getVariantChangedFields = useCallback((variantIndex: number) => {
        const originalVariants = (baseResult.originalData as T).variants || [];
        const currentVariants = baseResult.formData.variants || [];

        const original = originalVariants[variantIndex] as Record<string, unknown> | undefined;
        const current = currentVariants[variantIndex] as Record<string, unknown> | undefined;

        if (!current) return [];
        if (!original) return Object.keys(current).filter(k => k !== 'id');

        return getChangedFieldNames(original, current);
    }, [baseResult.formData, baseResult.originalData]);

    return {
        ...baseResult,
        getDirtyVariants,
        isVariantDirty,
        getVariantChangedFields
    };
}

export default useDirtyForm;
