import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Order } from '../../orders/models/order.model';
import { Table, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);

  private readonly _tables = signal<Table[]>([]);
  private readonly _ordersByTable = signal<Record<string, Order[] | undefined>>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly ordersByTable = this._ordersByTable.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(restaurantId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [tables, occupied] = await Promise.all([
        firstValueFrom(this.tableService.getAll(restaurantId)),
        firstValueFrom(this.tableService.getOccupiedOrders(restaurantId)),
      ]);
      this._tables.set([...tables].sort((a, b) => a.numero - b.numero));
      this._ordersByTable.set(
        Object.fromEntries(occupied.map(entry => [entry.table.id, entry.orders]))
      );
    } catch (err: any) {
      this._error.set(err.message || 'Error al cargar las mesas');
    } finally {
      this._loading.set(false);
    }
  }

  async updateStatus(restaurantId: string, id: string, estado: TableStatus): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.tableService.updateStatus(restaurantId, id, { estado })
      );
      this._tables.update(tables => tables.map(t => (t.id === id ? updated : t)));
      if (estado !== 'ocupada') {
        this._ordersByTable.update(({ [id]: _removed, ...rest }) => rest);
      }
      await this.load(restaurantId);
    } catch (err: any) {
      this._error.set(err.error?.message || err.message || 'Error al cambiar el estado de la mesa');
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.load(restaurantId);
    this.pollingInterval = setInterval(() => {
      this.load(restaurantId);
    }, 30000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
