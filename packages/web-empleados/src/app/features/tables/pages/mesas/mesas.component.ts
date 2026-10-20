import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId;
  }

  // El cocinero solo puede consultar (la API devuelve 403 en el PATCH)
  readonly canChangeStatus = computed(() => this.authStore.userRole() !== 'cocinero');

  ngOnInit(): void {
    if (this.restaurantId) {
      this.tableStore.startPolling(this.restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  changeStatus(tableId: string, estado: TableStatus): void {
    if (this.restaurantId) {
      this.tableStore.updateStatus(this.restaurantId, tableId, estado);
    }
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`;
  }
}
