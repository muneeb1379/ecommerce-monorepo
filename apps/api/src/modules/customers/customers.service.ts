import type { Database } from '../../lib/db.js'
import { notFound } from '../../lib/errors.js'
import type { PageRequest } from '../../lib/pagination.js'
import type { CustomersRepository } from './customers.repository.js'
import type { CustomerSort } from './customers.types.js'

/**
 * Read-only customer views for the admin dashboard. Customers are created by
 * checkout; there is no admin create/edit flow yet (see feature README).
 */
export class CustomersService {
  constructor(
    private readonly db: Database,
    private readonly repository: CustomersRepository,
  ) {}

  list(filters: { search?: string | undefined; sort: CustomerSort }, page: PageRequest) {
    return this.repository.list(this.db.sql, filters, page)
  }

  async getById(id: string) {
    const customer = await this.repository.findById(this.db.sql, id)
    if (!customer) throw notFound('Customer')
    return customer
  }
}
