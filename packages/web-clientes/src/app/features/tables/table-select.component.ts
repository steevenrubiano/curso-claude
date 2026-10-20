import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
      <div class="page-header">
        <h1>Elige tu mesa</h1>
        <p>Indica cuántas personas sois y selecciona una mesa libre</p>
      </div>

      <div class="card people-form">
        <label for="people">Número de personas</label>
        <input id="people" type="number" min="1" step="1" class="form-control"
               [ngModel]="people()" (ngModelChange)="people.set($event)" />
        <button class="btn btn-primary" (click)="search()" [disabled]="loading()">Ver mesas</button>
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (tables() !== null) {
        @if (tables()!.length === 0) {
          <div class="empty-state">
            <p>No hay mesas libres para {{ searched() }} personas</p>
          </div>
        } @else {
          <div class="table-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                      (click)="selectedId.set(table.id)">
                <h3>Mesa {{ table.numero }}</h3>
                <p>{{ table.descripcion }}</p>
                <p class="capacity">Capacidad: {{ table.capacidad }}</p>
              </button>
            }
          </div>
          <div class="actions">
            <button class="btn btn-primary" (click)="continue()" [disabled]="!selectedId() || occupying()">
              Continuar
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .back-link { display: inline-block; margin-bottom: 16px; color: var(--text-muted); }
    .people-form { display: flex; gap: 12px; align-items: center; padding: 20px; margin-bottom: 20px; }
    .people-form input { width: 100px; }
    .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .table-card { padding: 16px; text-align: left; cursor: pointer; transition: all var(--transition); }
    .table-card:hover, .table-card.selected { border-color: var(--green-medium); }
    .table-card.selected { background: var(--bg-hover); }
    .table-card .capacity { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
    .actions { margin-top: 20px; display: flex; justify-content: flex-end; }
  `]
})
export class TableSelectComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private readonly restaurantId = this.route.snapshot.paramMap.get('id')!

  readonly people = signal<number>(2)
  readonly searched = signal<number>(0)
  readonly tables = signal<Table[] | null>(null)
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)

  search(): void {
    const people = Number(this.people())
    if (!Number.isInteger(people) || people < 1) {
      this.error.set('Indica un número de personas válido (1 o más)')
      return
    }
    this.loading.set(true)
    this.error.set(null)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.searched.set(people)
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const tableId = this.selectedId()
    if (!tableId) return
    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, tableId, this.searched()).subscribe({
      next: (table) => {
        this.cartStore.setTable(table)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.search()
          this.error.set('Esa mesa ya no está disponible. Elige otra.')
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
