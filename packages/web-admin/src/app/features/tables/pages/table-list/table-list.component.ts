import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''

  statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  ngOnInit(): void {
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  async onStatusChange(id: string, event: Event): Promise<void> {
    if (!this.restaurantId) return
    const estado = (event.target as HTMLSelectElement).value as TableStatus
    try {
      await this.store.updateStatus(this.restaurantId, id, estado)
    } catch (err: any) {
      alert(err?.error?.message ?? 'Error al cambiar el estado de la mesa.')
      await this.store.loadByRestaurant(this.restaurantId)
    }
  }

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar esta mesa?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err: any) {
        alert(err?.error?.message ?? 'Error al eliminar la mesa.')
      }
    }
  }
}
