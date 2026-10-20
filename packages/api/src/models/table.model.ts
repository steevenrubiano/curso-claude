import { InvalidTableError } from '@errors/DomainErrors.js'

const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatusType = typeof VALID_TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    numero: number
    descripcion: string
    capacidad: number
    estado: TableStatusType
}

export interface TableFilters {
    estado?: TableStatusType
    minCapacidad?: number
}

export function normalizeTableStatus(value: unknown): TableStatusType {
    const normalized = typeof value === 'string' ? value.toLowerCase().trim() : ''
    if (!VALID_TABLE_STATUSES.includes(normalized as TableStatusType)) {
        throw new InvalidTableError(`Invalid estado: ${String(value)}. Must be one of: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatusType
}

export function parsePositiveInteger(value: unknown, field: string, allowNumericString = false): number {
    const parsed = allowNumericString && typeof value === 'string' && value.trim() !== '' ? Number(value) : value
    if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1) {
        throw new InvalidTableError(`${field} must be an integer greater than or equal to 1`)
    }
    return parsed
}
