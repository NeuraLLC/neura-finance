import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
}

interface QueryCriteria {
  [key: string]: any;
}

class DatabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );
  }

  /**
   * Get Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Insert a record
   */
  async insert<T = any>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }

    return result as T;
  }

  /**
   * Find record by ID
   */
  async findById<T = any>(table: string, id: string | number): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Database query error: ${error.message}`);
    }

    return data as T | null;
  }

  /**
   * Find one record by criteria
   */
  async findOne<T = any>(table: string, criteria: QueryCriteria): Promise<T | null> {
    let query = this.client.from(table).select('*');

    // Apply criteria
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database query error: ${error.message}`);
    }

    return data as T | null;
  }

  /**
   * Find multiple records by criteria
   */
  async findMany<T = any>(
    table: string,
    criteria: QueryCriteria = {},
    options: QueryOptions = {}
  ): Promise<T[]> {
    let query = this.client.from(table).select('*');

    // Apply criteria
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply options
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    if (options.orderBy) {
      const [column, direction = 'asc'] = options.orderBy.split(':');
      query = query.order(column, { ascending: direction === 'asc' });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    return (data || []) as T[];
  }

  /**
   * Update a record
   */
  async update<T = any>(table: string, id: string | number, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database update error: ${error.message}`);
    }

    return result as T;
  }

  /**
   * Update by criteria
   */
  async updateWhere<T = any>(
    table: string,
    criteria: QueryCriteria,
    data: Partial<T>
  ): Promise<T[]> {
    let query = this.client
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() });

    // Apply criteria
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      throw new Error(`Database update error: ${error.message}`);
    }

    return (result || []) as T[];
  }

  /**
   * Delete a record
   */
  async delete(table: string, id: string | number): Promise<boolean> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database delete error: ${error.message}`);
    }

    return true;
  }

  /**
   * Count records
   */
  async count(table: string, criteria: QueryCriteria = {}): Promise<number> {
    let query = this.client.from(table).select('*', { count: 'exact', head: true });

    // Apply criteria
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Database count error: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    const { data, error } = await this.client.rpc('exec_sql', {
      sql_query: sql,
      params,
    });

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    return data as T;
  }
}

// Export singleton instance
export default new DatabaseService();
