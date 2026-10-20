import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Table, TableWithOrders, UpdateTableStatusDto } from '../models/table.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient);

  private baseUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`;
  }

  getAll(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(this.baseUrl(restaurantId));
  }

  getOccupiedOrders(restaurantId: string): Observable<TableWithOrders[]> {
    return this.http.get<TableWithOrders[]>(`${this.baseUrl(restaurantId)}/occupied-orders`);
  }

  updateStatus(restaurantId: string, id: string, dto: UpdateTableStatusDto): Observable<Table> {
    return this.http.patch<Table>(`${this.baseUrl(restaurantId)}/${id}/status`, dto);
  }
}
